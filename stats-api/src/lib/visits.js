import { createHash } from "node:crypto";
import { getRedis } from "./redis.js";
import { normalizeProject } from "./projects.js";

function hashVisitor(ip, userAgent) {
  return createHash("sha256")
    .update(`${ip ?? ""}|${userAgent ?? ""}`)
    .digest("hex")
    .slice(0, 24);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function visitKeys(project) {
  const normalized = normalizeProject(project);

  return {
    total: `projects:${normalized}:visits:total`,
    first: `projects:${normalized}:visits:first`,
    dedupPrefix: `projects:${normalized}:visits:dedup:`,
    uniqueDayPrefix: `projects:${normalized}:visits:unique:`,
  };
}

export async function recordVisit({ ip, userAgent, dedupSeconds, project }) {
  const redis = getRedis();
  const keys = visitKeys(project);
  const dedup = Math.max(0, Number(dedupSeconds) || 0);
  const visitorHash = hashVisitor(ip, userAgent);
  const dedupKey = `${keys.dedupPrefix}${visitorHash}`;
  const dayKey = `${keys.uniqueDayPrefix}${todayKey()}`;

  let countedAsUnique = true;
  if (dedup > 0) {
    const dedupSet = await redis.set(dedupKey, "1", {
      nx: true,
      ex: dedup,
    });
    countedAsUnique = Boolean(dedupSet);
  }

  const pipeline = redis.multi();
  pipeline.incr(keys.total);
  pipeline.setnx(keys.first, new Date().toISOString());
  if (countedAsUnique) {
    pipeline.incr(dayKey);
    pipeline.expire(dayKey, 60 * 60 * 26);
  }

  const results = await pipeline.exec();
  const total = Number(results?.[0] ?? 0);

  return {
    project: normalizeProject(project),
    total,
    countedAsUnique,
  };
}

export async function getVisitStats(project) {
  const redis = getRedis();
  const keys = visitKeys(project);
  const [total, first, today] = await Promise.all([
    redis.get(keys.total),
    redis.get(keys.first),
    redis.get(`${keys.uniqueDayPrefix}${todayKey()}`),
  ]);

  return {
    total: Number(total ?? 0),
    uniqueToday: Number(today ?? 0),
    since: typeof first === "string" ? first : null,
  };
}
