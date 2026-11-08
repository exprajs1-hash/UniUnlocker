"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { ViewAllLink } from "@/components/listing/view-all-link";
import { SectionHeading } from "@/components/sections/section-heading";
import { CurrencyToggle, ServerMarquee } from "@/components/sections/server-card";
import { computeOverallStatus, OVERALL_META } from "@/lib/server-status";
import type { OverallStatus, ServerDTO } from "@/types";

const POLL_MS = 20_000;
/** Online share (%) at which the status circle turns green. */
const HEALTHY_PERCENT = 50;

const OVERALL_VISUAL: Record<OverallStatus, { color: string; glow: string }> = {
  operational: { color: "text-status-online", glow: "var(--status-online)" },
  partial_outage: { color: "text-status-offline", glow: "var(--status-offline)" },
  major_outage: { color: "text-status-offline", glow: "var(--status-offline)" },
  under_maintenance: { color: "text-status-maintenance", glow: "var(--status-maintenance)" },
  unknown: { color: "text-muted", glow: "var(--muted)" },
};

/** Shows the latest statuses, refreshing in the background while the tab is visible. */
export function ServerStatusLive({ initialServers }: { initialServers: ServerDTO[] | null }) {
  const [servers, setServers] = useState(initialServers);
  const [unreachable, setUnreachable] = useState(initialServers === null);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      if (document.hidden) return;
      fetch("/api/servers", { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error(`Status ${response.status}`);
          return response.json() as Promise<{ servers: ServerDTO[] }>;
        })
        .then((body) => {
          if (cancelled) return;
          setServers(body.servers);
          setUnreachable(false);
        })
        .catch(() => {
          if (!cancelled) setUnreachable(true);
        });
    };

    const timer = setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const overall = servers ? computeOverallStatus(servers) : "unknown";
  const meta = OVERALL_META[overall];
  const visual = OVERALL_VISUAL[overall];
  const total = servers?.length ?? 0;
  const onlineCount = servers?.filter((server) => server.status === "online").length ?? 0;
  const onlinePercent = total > 0 ? Math.round((onlineCount / total) * 100) : null;
  // The circle follows the online share: green at or above the threshold, red below it.
  const circle =
    onlinePercent === null
      ? OVERALL_VISUAL.unknown
      : onlinePercent >= HEALTHY_PERCENT
        ? OVERALL_VISUAL.operational
        : OVERALL_VISUAL.major_outage;
  const maintenanceCount = servers?.filter((server) => server.status === "maintenance").length ?? 0;
  const onlineEnd = total > 0 ? (onlineCount / total) * 100 : 0;
  const maintenanceEnd = total > 0 ? ((onlineCount + maintenanceCount) / total) * 100 : 0;
  const ringBackground =
    total > 0
      ? `conic-gradient(var(--status-online) 0% ${onlineEnd}%, var(--status-maintenance) ${onlineEnd}% ${maintenanceEnd}%, var(--status-offline) ${maintenanceEnd}% 100%)`
      : "var(--muted)";

  return (
    <div className="neon-card relative overflow-hidden p-5 sm:p-8">
      <div className="mb-4 flex items-center justify-end gap-2 md:absolute md:top-5 md:right-5 md:mb-0">
        <CurrencyToggle />
        <ViewAllLink href="/servers" size="small" />
      </div>
      <SectionHeading highlight="Status" lead="Server" subtitle={meta.message} />

      <div className="mt-8 grid items-center gap-8 lg:grid-cols-[auto_1fr_auto]">
        <div aria-hidden className="relative mx-auto hidden size-40 items-center justify-center lg:flex">
          <div className="flex w-32 flex-col gap-2">
            {[0, 1, 2, 3].map((rack) => (
              <span
                key={rack}
                className="flex h-7 items-center gap-1.5 rounded-md border border-cyan/70 bg-linear-to-r from-surface-raised to-primary/50 px-2 shadow-[0_0_14px_rgb(8_123_255/0.7)]"
              >
                <span className="size-1.5 rounded-full bg-cyan shadow-[0_0_6px_var(--cyan)]" />
                <span className="size-1.5 rounded-full bg-status-online" />
                <span className="ml-auto h-1 w-10 rounded-full bg-cyan/50" />
              </span>
            ))}
          </div>
          <ShieldCheck className="absolute -right-2 -bottom-1 size-16 fill-background text-status-online drop-shadow-[0_0_12px_rgb(43_234_92/0.8)]" />
        </div>

        {servers && servers.length > 0 ? (
          <div className="min-w-0">
            <ServerMarquee servers={servers} />
          </div>
        ) : (
          <p className="py-8 text-center text-muted">
            {servers ? "No servers are listed right now." : "Live status is temporarily unavailable."}
          </p>
        )}

        <div className="flex flex-col items-center gap-3 border-line/40 text-center lg:border-l lg:pl-8">
          {/* Ring split by share: green arc = online, yellow = maintenance, red = offline. */}
          <span
            className="relative flex size-24 items-center justify-center rounded-full p-1"
            style={{ background: ringBackground, filter: `drop-shadow(0 0 10px ${circle.glow})` }}
          >
            <span
              className={`flex size-full flex-col items-center justify-center rounded-full bg-background ${circle.color}`}
              style={{ boxShadow: `inset 0 0 18px ${circle.glow}` }}
            >
              <span className="font-display text-2xl leading-none font-bold">
                {onlinePercent === null ? "–" : `${onlinePercent}%`}
              </span>
              {onlinePercent !== null && (
                <span className="mt-1 text-[11px] font-medium text-foreground/80">
                  {onlineCount}/{total} Online
                </span>
              )}
            </span>
          </span>
          <div role="status">
            <p className="text-sm font-semibold">Server Status</p>
            <p className={`font-display text-lg font-bold ${visual.color}`}>{meta.label}</p>
          </div>
        </div>
      </div>

      {unreachable && servers && (
        <p role="alert" className="mt-5 text-center text-sm text-status-maintenance">
          Could not refresh just now, so this may be out of date.
        </p>
      )}
    </div>
  );
}
