const PROJECT_ID = "hand-outs";
const STATS_API_URL = (
  process.env.NEXT_PUBLIC_STATS_API_URL ?? "https://hand-outs-stats-api.onrender.com"
).replace(/\/$/, "");

export interface HandOutStats {
  visits: {
    total: number | null;
    uniqueToday: number | null;
  };
  events: {
    handoutsGenerated: number | null;
  };
}

const unavailableStats: HandOutStats = {
  visits: {
    total: null,
    uniqueToday: null,
  },
  events: {
    handoutsGenerated: null,
  },
};

export async function loadHandOutStats(): Promise<HandOutStats> {
  try {
    const response = await fetch(`${STATS_API_URL}/stats?project=${PROJECT_ID}`, {
      cache: "no-store",
    });
    if (!response.ok) return unavailableStats;

    const data = await response.json();
    return {
      visits: {
        total: nullableNumber(data?.visits?.total),
        uniqueToday: nullableNumber(data?.visits?.uniqueToday),
      },
      events: {
        handoutsGenerated: nullableNumber(data?.events?.handoutsGenerated),
      },
    };
  } catch {
    return unavailableStats;
  }
}

export function recordHandOutVisit() {
  sendStatsRequest("/visit", { project: PROJECT_ID });
}

export function recordHandoutGenerated() {
  sendStatsRequest("/event", {
    project: PROJECT_ID,
    event: "handout-generated",
  });
}

function sendStatsRequest(path: string, body: Record<string, string>) {
  try {
    fetch(`${STATS_API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* best-effort stats */
  }
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
