import type { OverallStatus, ServerStatus } from "@/types";

export const STATUS_META: Record<
  ServerStatus,
  { label: string; dot: string; text: string; border: string }
> = {
  online: {
    label: "Online",
    dot: "bg-status-online",
    text: "text-status-online",
    border: "border-status-online/40",
  },
  offline: {
    label: "Offline",
    dot: "bg-status-offline",
    text: "text-status-offline",
    border: "border-status-offline/40",
  },
  maintenance: {
    label: "Maintenance",
    dot: "bg-status-maintenance",
    text: "text-status-maintenance",
    border: "border-status-maintenance/40",
  },
};

export const OVERALL_META: Record<
  OverallStatus,
  { label: string; message: string; tone: ServerStatus | "unknown" }
> = {
  operational: {
    label: "Operational",
    message: "All systems are running smoothly",
    tone: "online",
  },
  partial_outage: {
    label: "Partial Outage",
    message: "Some servers are currently unavailable",
    tone: "offline",
  },
  major_outage: {
    label: "Major Outage",
    message: "Most servers are currently unavailable",
    tone: "offline",
  },
  under_maintenance: {
    label: "Under Maintenance",
    message: "Maintenance is in progress on some servers",
    tone: "maintenance",
  },
  unknown: {
    label: "No Data",
    message: "Server status is not available right now",
    tone: "unknown",
  },
};

/**
 * Derives the headline status from the individual servers:
 * - any offline: major outage when at least half are offline, otherwise partial
 * - none offline but some in maintenance: under maintenance
 * - all online: operational
 */
export function computeOverallStatus(
  servers: ReadonlyArray<{ status: ServerStatus }>,
): OverallStatus {
  if (servers.length === 0) return "unknown";
  const offline = servers.filter((s) => s.status === "offline").length;
  if (offline > 0) {
    return offline / servers.length >= 0.5 ? "major_outage" : "partial_outage";
  }
  return servers.some((s) => s.status === "maintenance") ? "under_maintenance" : "operational";
}
