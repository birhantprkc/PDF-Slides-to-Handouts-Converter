import "dotenv/config";
import express from "express";
import cors from "cors";
import { getEventStats, normalizeEvent, recordEvent } from "./lib/events.js";
import { normalizeProject } from "./lib/projects.js";
import { getVisitStats, recordVisit } from "./lib/visits.js";
import { isRedisConfigured } from "./lib/redis.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1kb" }));

const allowedOrigins = (
  process.env.ALLOWED_ORIGIN ??
  "https://hand-outs.com,https://www.hand-outs.com"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) return callback(null, true);
      const error = new Error(`Origin ${origin} not allowed`);
      error.status = 403;
      return callback(error);
    },
    methods: ["GET", "POST", "OPTIONS"],
  }),
);

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function getRequestedProject(req) {
  return normalizeProject(req.body?.project ?? req.query?.project);
}

app.get(
  "/health",
  asyncHandler(async (_req, res) => {
    res.json({
      ok: true,
      project: normalizeProject(),
      redis: isRedisConfigured() ? "configured" : "missing",
      timestamp: new Date().toISOString(),
    });
  }),
);

app.post(
  "/visit",
  asyncHandler(async (req, res) => {
    if (!isRedisConfigured()) {
      return res.status(503).json({ error: "Storage not configured" });
    }

    const ip =
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "";
    const userAgent = req.headers["user-agent"]?.toString() ?? "";
    const dedupSeconds = Number(process.env.VISIT_DEDUP_SECONDS ?? 1800);
    const result = await recordVisit({
      ip,
      userAgent,
      dedupSeconds,
      project: getRequestedProject(req),
    });
    res.json(result);
  }),
);

app.post(
  "/event",
  asyncHandler(async (req, res) => {
    if (!isRedisConfigured()) {
      return res.status(503).json({ error: "Storage not configured" });
    }

    const event = normalizeEvent(req.body?.event ?? req.query?.event);
    if (!event) {
      return res.status(400).json({ error: "Unsupported event" });
    }

    const result = await recordEvent({
      project: getRequestedProject(req),
      event,
    });
    res.json(result);
  }),
);

app.get(
  "/stats",
  asyncHandler(async (req, res) => {
    if (!isRedisConfigured()) {
      return res.status(503).json({ error: "Storage not configured" });
    }

    const project = getRequestedProject(req);
    const [visits, events] = await Promise.all([
      getVisitStats(project),
      getEventStats(project),
    ]);
    res.json({ project, visits, events });
  }),
);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((error, _req, res, _unused) => {
  if (error.status === 403) {
    return res.status(403).json({ error: error.message });
  }
  console.error("[hand-outs-stats-api]", error);
  res.status(500).json({ error: error.message || "Internal error" });
});

const port = Number(process.env.PORT ?? 10000);
app.listen(port, () => {
  console.log(`[hand-outs-stats-api] listening on :${port}`);
});
