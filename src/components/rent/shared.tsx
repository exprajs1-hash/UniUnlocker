"use client";

import { Check, Copy, Wrench } from "lucide-react";
import { useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { isUsableImageUrl } from "@/lib/images";
import { parseResultLines } from "@/lib/provider-text";
import type { BalanceTransactionType, RentOrderStatus } from "@/types";

/** The admin's tool icon, or a wrench on a gradient tile when none is set. */
export function ToolIcon({ src, name, size = 40 }: { src: string; name: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-linear-to-br from-primary to-purple text-white shadow-md shadow-primary/30"
    >
      {src && isUsableImageUrl(src) ? (
        <SafeImage src={src} alt={`${name} icon`} fill sizes={`${size}px`} className="bg-white object-contain p-0.5" />
      ) : (
        <Wrench aria-hidden style={{ width: size * 0.45, height: size * 0.45 }} />
      )}
    </span>
  );
}

const BDT = new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 });

export function formatBdt(amount: number): string {
  return `৳${BDT.format(amount)}`;
}

/** The customer's price, with the public price struck through when they have a special (lower) rate. */
export function PriceTag({ price, regular }: { price: number; regular?: number }) {
  return (
    <>
      {regular !== undefined && regular > price && (
        <s className="mr-1.5 text-[0.7em] font-normal text-muted" aria-label={`Regular price ${formatBdt(regular)}`}>
          {formatBdt(regular)}
        </s>
      )}
      {formatBdt(price)}
    </>
  );
}

export function formatSignedBdt(amount: number): string {
  return `${amount > 0 ? "+" : "−"}${formatBdt(Math.abs(amount))}`;
}

const STATUS_STYLE: Record<RentOrderStatus, { label: string; className: string }> = {
  submitting: { label: "Confirming", className: "bg-status-maintenance/15 text-status-maintenance" },
  pending: { label: "Pending", className: "bg-status-maintenance/15 text-status-maintenance" },
  processing: { label: "Processing", className: "bg-primary/20 text-cyan" },
  completed: { label: "Completed", className: "bg-status-online/15 text-status-online" },
  rejected: { label: "Rejected", className: "bg-status-offline/15 text-status-offline" },
  failed: { label: "Failed", className: "bg-status-offline/15 text-status-offline" },
};

export const ORDER_STATUS_LABELS: Record<RentOrderStatus, string> = Object.fromEntries(
  Object.entries(STATUS_STYLE).map(([key, value]) => [key, value.label]),
) as Record<RentOrderStatus, string>;

/**
 * `customer` shows "failed" as "Rejected": to the customer both mean the order was not delivered
 * (and refunded). The admin panel keeps them apart, since "failed" points at our side.
 */
export function OrderStatusBadge({
  status,
  refunded,
  customer = false,
}: {
  status: RentOrderStatus;
  refunded?: boolean;
  customer?: boolean;
}) {
  const style = STATUS_STYLE[customer && status === "failed" ? "rejected" : status];
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}>{style.label}</span>
      {refunded && <span className="rounded-full bg-glass/10 px-2.5 py-0.5 text-xs font-semibold">Refunded</span>}
    </span>
  );
}

export const TRANSACTION_LABELS: Record<BalanceTransactionType, string> = {
  admin_credit: "Balance added",
  admin_debit: "Balance deducted",
  order: "Rent order",
  refund: "Refund",
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the text is still selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-glass/10"
    >
      {copied ? <Check aria-hidden className="size-4 text-status-online" /> : <Copy aria-hidden className="size-4" />}
    </button>
  );
}

/**
 * The delivered login/code. Each line has its own copy button that copies only
 * the value (not "Username:"); the top button copies all values, one per line.
 */
export function OrderResult({ text }: { text: string }) {
  if (!text) return null;
  const lines = parseResultLines(text);
  const labelled = lines.some((line) => line.label !== null);

  return (
    <div className="mt-2 rounded-lg border border-glass/10 bg-background/60 p-2">
      {lines.length > 1 && labelled && (
        <div className="flex justify-end border-b border-glass/10 pb-1">
          <span className="inline-flex items-center gap-1 text-xs opacity-70">
            Copy all values <CopyButton value={lines.map((line) => line.value).join("\n")} label="Copy all values" />
          </span>
        </div>
      )}
      <ul className="font-mono text-sm">
        {lines.map((line, index) => (
          <li key={index} className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-glass/5">
            <span className="min-w-0 flex-1 wrap-break-word">
              {line.label !== null && <span className="opacity-60">{line.label}: </span>}
              <span className="select-all">{line.value}</span>
            </span>
            <CopyButton value={line.value} label={line.label ? `Copy ${line.label}` : "Copy"} />
          </li>
        ))}
      </ul>
    </div>
  );
}
