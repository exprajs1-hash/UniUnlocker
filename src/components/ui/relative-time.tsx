"use client";

import { useSyncExternalStore } from "react";
import { formatDateTimeUtc, formatRelative } from "@/utils/format";

const TICK_MS = 30_000;

function subscribe(onTick: () => void) {
  const timer = setInterval(onTick, TICK_MS);
  return () => clearInterval(timer);
}

const getNow = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;
const getServerNow = () => null;

/** Renders a fixed timestamp on the server, then a live "5m ago" in the browser. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);
  const absolute = formatDateTimeUtc(iso);
  return (
    <time dateTime={iso} title={absolute} className={className}>
      {now === null ? absolute : formatRelative(iso, now)}
    </time>
  );
}
