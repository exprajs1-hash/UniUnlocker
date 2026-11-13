"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import type { BalanceTransactionType, RentOrderStatus } from "@/types";

const BDT = new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 });

export function formatBdt(amount: number): string {
  return `৳${BDT.format(amount)}`;
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

export function OrderStatusBadge({ status, refunded }: { status: RentOrderStatus; refunded?: boolean }) {
  const style = STATUS_STYLE[status];
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}>{style.label}</span>
      {refunded && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold">Refunded</span>}
    </span>
  );
}

export const TRANSACTION_LABELS: Record<BalanceTransactionType, string> = {
  admin_credit: "Balance added",
  admin_debit: "Balance deducted",
  order: "Rent order",
  refund: "Refund",
};

/** The delivered login/code, kept as plain text with a copy button. */
export function OrderResult({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; the text is still selectable.
    }
  }

  return (
    <div className="relative mt-2 rounded-lg border border-white/10 bg-black/30 p-3 pr-11">
      <pre className="font-mono text-sm break-words whitespace-pre-wrap">{text}</pre>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copied ? "Copied" : "Copy"}
        title={copied ? "Copied" : "Copy"}
        className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-md hover:bg-white/10"
      >
        {copied ? <Check aria-hidden className="size-4 text-status-online" /> : <Copy aria-hidden className="size-4" />}
      </button>
    </div>
  );
}
