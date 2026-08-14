"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Eye, FileOutput } from "lucide-react";
import {
  HandOutStats as HandOutStatsData,
  loadHandOutStats,
  recordHandOutVisit,
} from "@/lib/stats";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function HandOutStats() {
  const [stats, setStats] = useState<HandOutStatsData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const nextStats = await loadHandOutStats();
      if (!cancelled) setStats(nextStats);
    };

    recordHandOutVisit();
    void refresh();
    const intervalId = window.setInterval(refresh, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Hand-Outs usage stats">
      <StatPill
        icon={<Eye className="h-4 w-4" aria-hidden="true" />}
        value={stats?.visits.total}
        label="views"
      />
      <StatPill
        icon={<FileOutput className="h-4 w-4" aria-hidden="true" />}
        value={stats?.events.handoutsGenerated}
        label="hand-outs generated"
      />
    </div>
  );
}

function StatPill({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number | null | undefined;
  label: string;
}) {
  return (
    <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background/80 px-3 text-sm text-foreground">
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-semibold tabular-nums">
        {typeof value === "number" ? formatNumber(value) : "-"}
      </span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}
