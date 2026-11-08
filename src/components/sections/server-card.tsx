"use client";

import { useSyncExternalStore } from "react";
import { Marquee } from "@/components/ui/marquee";
import { RelativeTime } from "@/components/ui/relative-time";
import { SafeImage } from "@/components/ui/safe-image";
import { STATUS_META } from "@/lib/server-status";
import type { ServerDTO } from "@/types";
import { formatPrice, type Currency } from "@/utils/format";

export const SERVER_COLUMNS = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

const STORAGE_KEY ="uniunlocker:currency";
const CHANGE_EVENT = "uniunlocker:currency-change";
const DEFAULT_CURRENCY: Currency = "BDT";

function readCurrency(): Currency {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "USD" ? "USD" : "BDT";
  } catch {
    return DEFAULT_CURRENCY;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Shared, remembered currency choice; every toggle and card on the page stays in sync. */
export function useCurrency(): [Currency, (next: Currency) => void] {
  const currency = useSyncExternalStore(subscribe, readCurrency, () => DEFAULT_CURRENCY);
  const setCurrency = (next: Currency) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be blocked; the choice then lasts only until reload.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };
  return [currency, setCurrency];
}

export function CurrencyToggle() {
  const [currency, setCurrency] = useCurrency();
  return (
    <div role="group" aria-label="Price currency" className="inline-flex rounded-full border border-line/70 bg-background/60 p-0.5 text-xs font-semibold">
      {(["BDT", "USD"] as const).map((option) => {
        const active = currency === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => setCurrency(option)}
            className={`rounded-full px-3 py-1.5 transition ${
              active
                ? "bg-linear-to-r from-primary to-[#00b4ff] text-white shadow-[0_0_12px_rgb(8_123_255/0.6)]"
                : "text-muted hover:text-foreground"
            }`}
          >
            {option === "BDT" ? "৳ BDT" : "$ USD"}
          </button>
        );
      })}
    </div>
  );
}

export function ServerCard({ server, number }: { server: ServerDTO; number: number }) {
  const [currency] = useCurrency();
  const status = STATUS_META[server.status];
  const amount = currency === "USD" ? server.priceUsd : server.priceBdt;
  const approximate = server.convertedCurrency === currency;
  return (
    <article className={`flex w-full flex-col items-center gap-2.5 rounded-xl border bg-background/50 p-4 text-center ${status.border}`}>
      <h3 className="text-sm font-semibold">
        {number}. {server.name}
      </h3>
      <SafeImage src={server.logo} alt="" width={48} height={48} className="size-12 rounded-lg object-contain" />
      {amount != null && (
        <p
          title={approximate ? `Converted from the ${currency === "USD" ? "BDT" : "USD"} price` : undefined}
          className="rounded-full border border-cyan/40 bg-cyan/10 px-3 py-0.5 text-sm font-bold text-cyan"
        >
          {approximate && <span aria-label="about">≈ </span>}
          {formatPrice(amount, currency)}
        </p>
      )}
      <p className={`flex items-center gap-2 font-semibold ${status.text}`}>
        <span aria-hidden className={`animate-pulse-dot size-3 rounded-full ${status.dot}`} />
        {status.label}
      </p>
      <p className="text-xs text-muted">
        Updated <RelativeTime iso={server.statusUpdatedAt} />
      </p>
    </article>
  );
}

/** Homepage: every server scrolling left, four in view (two on phones). */
export function ServerMarquee({ servers }: { servers: ServerDTO[] }) {
  return (
    <Marquee label="Servers" itemClassName="w-[calc(100cqw/2)] md:w-[calc(100cqw/4)]">
      {servers.map((server, index) => (
        <ServerCard key={server.id} server={server} number={index + 1} />
      ))}
    </Marquee>
  );
}

export function ServerCardGrid({ servers, startNumber = 1, className }: { servers: ServerDTO[]; startNumber?: number; className: string }) {
  return (
    <ul className={className}>
      {servers.map((server, index) => (
        <li key={server.id} className="flex">
          <ServerCard server={server} number={startNumber + index} />
        </li>
      ))}
    </ul>
  );
}
