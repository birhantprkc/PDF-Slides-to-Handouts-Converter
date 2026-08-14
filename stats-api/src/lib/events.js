import { getRedis } from "./redis.js";
import { normalizeProject } from "./projects.js";

const EVENT_DEFINITIONS = {
  "handout-generated": {
    responseKey: "handoutsGenerated",
    storageKey: "handout-generated",
  },
};

export function normalizeEvent(event) {
  const value = String(event ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

  return EVENT_DEFINITIONS[value] ? value : null;
}

function eventKey(project, event) {
  const normalizedProject = normalizeProject(project);
  const definition = EVENT_DEFINITIONS[event];
  return `projects:${normalizedProject}:events:${definition.storageKey}`;
}

export async function recordEvent({ project, event }) {
  const normalizedEvent = normalizeEvent(event);
  if (!normalizedEvent) {
    throw new Error("Unsupported event");
  }

  const redis = getRedis();
  const normalizedProject = normalizeProject(project);
  const total = await redis.incr(eventKey(normalizedProject, normalizedEvent));

  return {
    project: normalizedProject,
    event: normalizedEvent,
    total: Number(total ?? 0),
  };
}

export async function getEventStats(project) {
  const redis = getRedis();
  const normalizedProject = normalizeProject(project);
  const entries = await Promise.all(
    Object.entries(EVENT_DEFINITIONS).map(async ([event, definition]) => {
      const total = await redis.get(eventKey(normalizedProject, event));
      return [definition.responseKey, Number(total ?? 0)];
    }),
  );

  return Object.fromEntries(entries);
}
