"use client";

import { BadgeCheck, Check, Copy, Crown, Gem, Globe, Store, User, Wrench } from "lucide-react";
import { useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { isUsableImageUrl } from "@/lib/images";
import { formatTaka } from "@/lib/money";
import { parseResultLines } from "@/lib/provider-text";
import { CUSTOMER_TAG_LABELS, type BalanceTransactionType, type CustomerTag, type RentOrderStatus } from "@/types";

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

/** "৳117" for whole taka, "৳0.50" / "৳116.27" when there are paisa. */
export const formatBdt = formatTaka;

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

/* ---------------------------------------------------------- customer tags */

const TAG_STYLE: Record<CustomerTag, { icon: typeof User; className: string }> = {
  customer: {
    icon: User,
    className: "border-line/60 bg-glass/10 text-muted",
  },
  reseller: { icon: Store, className: "border-cyan/50 bg-cyan/15 text-cyan" },
  vip_admin: {
    icon: Gem,
    className: "border-purple/60 bg-purple/20 text-purple",
  },
  web_owner: {
    icon: Globe,
    className: "border-emerald-500/50 bg-emerald-500/15 text-emerald-500",
  },
  founder_ceo: {
    icon: Crown,
    className: "border-amber-400/60 bg-amber-400/15 text-amber-500",
  },
};

/** The badge the admin gave this customer. Cosmetic only. */
export function CustomerTagBadge({ tag = "customer", className = "" }: { tag?: CustomerTag; className?: string }) {
  const { icon: Icon, className: tone } = TAG_STYLE[tag] ?? TAG_STYLE.customer;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap uppercase ${tone} ${className}`}
    >
      <Icon aria-hidden className="size-3" />
      {CUSTOMER_TAG_LABELS[tag] ?? CUSTOMER_TAG_LABELS.customer}
      {tag !== "customer" && <BadgeCheck aria-hidden className="size-3" />}
    </span>
  );
}

/** Profile picture, or the first letter of the name on a gradient when none is set. */
export function CustomerAvatar({ src, name, size = 56 }: { src?: string; name: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-primary to-purple font-display font-bold text-white shadow-lg shadow-primary/30"
    >
      {src && isUsableImageUrl(src) ? (
        <SafeImage src={src} alt={`${name}'s photo`} fill sizes={`${size * 2}px`} className="object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.38 }}>{name.trim().charAt(0).toUpperCase() || "?"}</span>
      )}
    </span>
  );
}
