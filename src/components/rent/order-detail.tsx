"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock,
  Hash,
  History,
  Hourglass,
  Info,
  KeyRound,
  ListChecks,
  Loader,
  Package,
  Undo2,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { formatBdt, OrderResult } from "@/components/rent/shared";
import { apiFetch, errorMessage } from "@/lib/client-api";
import type { RentOrderDetailDTO, RentOrderStatus } from "@/types";

const POLL_MS = 10_000;
const OPEN: RentOrderStatus[] = ["submitting", "pending", "processing"];

const DATE_TIME = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});
const SHORT_DATE_TIME = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "November 09, 2026 at 08:02 AM" */
function longDate(iso: string): string {
  return DATE_TIME.format(new Date(iso)).replace(/, (\d{1,2}:\d{2})/, " at $1");
}

function duration(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "Less than a minute";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours} h ${rest} min` : `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ${hours % 24} h`;
}

type Step = { label: string; at: string | null; icon: LucideIcon; state: "done" | "current" | "waiting" | "failed"; note?: string };

/** Placed → Processing → Completed (or Rejected/Failed), with the time each was reached. */
function buildSteps(order: RentOrderDetailDTO): Step[] {
  const first = (statuses: RentOrderStatus[]) => order.history.find((entry) => statuses.includes(entry.status))?.at ?? null;
  const placedAt = order.history[0]?.at ?? order.createdAt;
  const finalAt = first(["completed", "rejected", "failed"]);
  const processingAt = first(["processing"]) ?? finalAt;
  const open = OPEN.includes(order.status);

  const steps: Step[] = [{ label: "Order placed", at: placedAt, icon: Clock, state: "done" }];

  if (order.status === "rejected" || order.status === "failed") {
    // Customers see one outcome for both: it went to processing, then was rejected (and refunded).
    const rejectedAt = finalAt ?? order.updatedAt;
    steps.push({ label: "Processing", at: first(["processing"]) ?? rejectedAt, icon: Loader, state: "done" });
    steps.push({
      label: "Rejected",
      at: rejectedAt,
      icon: X,
      state: "failed",
      note: order.refunded ? `${formatBdt(order.priceBdt)} returned to your balance.` : undefined,
    });
    return steps;
  }

  steps.push({
    label: "Processing",
    at: order.status === "pending" || order.status === "submitting" ? null : processingAt,
    icon: Loader,
    state: order.status === "processing" ? "current" : order.status === "completed" ? "done" : "waiting",
  });
  steps.push({
    label: "Completed",
    at: order.status === "completed" ? (finalAt ?? order.updatedAt) : null,
    icon: Check,
    state: order.status === "completed" ? "done" : "waiting",
    note: open ? "Your details will appear here as soon as they are ready." : undefined,
  });
  return steps;
}

/** Card header: icon chip + bold title, with a gradient accent line underneath. */
function CardHeader({ icon: Icon, title, as: Tag = "h2", action }: { icon: LucideIcon; title: string; as?: "h1" | "h2"; action?: ReactNode }) {
  return (
    <div className="relative flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
      <Tag className="flex items-center gap-3 font-display text-lg font-bold">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/40">
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="bg-linear-to-r from-primary to-purple bg-clip-text text-transparent">{title}</span>
      </Tag>
      {action}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-linear-to-r from-primary via-purple to-primary/10" />
    </div>
  );
}

function Section({ icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="neon-card overflow-hidden p-0">
      <CardHeader icon={icon} title={title} />
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="group relative grid grid-cols-1 gap-1.5 py-4 pl-3 transition-colors hover:bg-primary/5 sm:grid-cols-[14rem_1fr] sm:items-center sm:gap-4">
      <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary opacity-0 transition-opacity group-hover:opacity-100" />
      <dt className="inline-flex items-center gap-2.5 text-xs font-bold tracking-wider text-muted uppercase">
        <Icon aria-hidden className="size-4 text-primary" /> {label}
      </dt>
      <dd className="min-w-0 text-base font-bold wrap-break-word sm:text-lg">{children}</dd>
    </div>
  );
}

const BIG_STATUS: Record<RentOrderStatus, { label: string; icon: LucideIcon; className: string }> = {
  submitting: { label: "Confirming", icon: Clock, className: "border-status-maintenance text-status-maintenance bg-status-maintenance/10" },
  pending: { label: "Pending", icon: Clock, className: "border-status-maintenance text-status-maintenance bg-status-maintenance/10" },
  processing: { label: "Processing", icon: Loader, className: "border-cyan text-cyan bg-primary/10" },
  completed: { label: "Completed", icon: Check, className: "border-status-online text-status-online bg-status-online/10" },
  rejected: { label: "Rejected", icon: X, className: "border-status-offline text-status-offline bg-status-offline/10" },
  failed: { label: "Rejected", icon: X, className: "border-status-offline text-status-offline bg-status-offline/10" },
};

/** Large outlined status pill, e.g. "⊗ REJECTED". */
function StatusPill({ status, refunded }: { status: RentOrderStatus; refunded: boolean }) {
  const { label, icon: Icon, className } = BIG_STATUS[status];
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-1.5 text-sm font-extrabold tracking-wider uppercase ${className}`}>
        <span className="flex size-4 items-center justify-center rounded-full bg-current">
          <Icon aria-hidden className={`size-2.5 text-white ${status === "processing" ? "animate-spin" : ""}`} strokeWidth={3} />
        </span>
        {label}
      </span>
      {refunded && (
        <span className="rounded-xl border-2 border-line/60 px-3 py-1.5 text-xs font-extrabold tracking-wider text-muted uppercase">
          Refunded
        </span>
      )}
    </span>
  );
}

export function OrderDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<RentOrderDetailDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** When the order was last loaded; "time so far" for an open order is measured to this. */
  const [loadedAt, setLoadedAt] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ order: RentOrderDetailDTO }>(`/api/me/orders/${id}`);
      setOrder(data.order);
      setLoadedAt(Date.now());
      setError(null);
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data comes from the API after mount
    void load();
  }, [load]);

  // While the order is open, keep checking so the result appears without a reload.
  const open = order ? OPEN.includes(order.status) : false;
  useEffect(() => {
    if (!open) return;
    const tick = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [open, load]);

  const back = (
    <Link href="/account" className="btn-outline min-h-9! px-3! text-sm font-bold">
      <ArrowLeft aria-hidden className="size-4" /> Back
    </Link>
  );

  if (error && !order) {
    return (
      <div className="neon-card p-8 text-center">
        <p className="mb-4 text-muted">{error}</p>
        {back}
      </div>
    );
  }
  if (!order) {
    return (
      <div role="status" aria-label="Loading" className="space-y-4">
        <div className="skeleton h-80" />
        <div className="skeleton h-32" />
        <div className="skeleton h-56" />
      </div>
    );
  }

  const steps = buildSteps(order);
  const finishedAt = !open ? (steps.at(-1)?.at ?? order.updatedAt) : null;
  const elapsed = (finishedAt ? new Date(finishedAt).getTime() : loadedAt) - new Date(order.createdAt).getTime();
  const parameters = [...Object.entries(order.fields), ["Quantity", String(order.quantity)] as [string, string]];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-5">
      {/* Details */}
      <section className="neon-card overflow-hidden p-0">
        <CardHeader icon={Info} title="Order Details" as="h1" action={back} />
        <dl className="divide-y divide-line/25 px-3 sm:px-4">
          <Row icon={Package} label="Service name">
            {order.serviceName}
          </Row>
          <Row icon={Hash} label="Order ID">
            <span className="text-cyan">#{order.id.slice(-6).toUpperCase()}</span>
          </Row>
          <Row icon={CalendarDays} label="Order created">
            {longDate(order.createdAt)}
          </Row>
          <Row icon={History} label="Order updated">
            {longDate(order.updatedAt)}
          </Row>
          <Row icon={Hourglass} label="Total time period">
            <span className={open ? "text-status-maintenance" : "text-status-online"}>
              {duration(elapsed)}
              {open && " so far"}
            </span>
          </Row>
          <Row icon={CircleDollarSign} label="Amount">
            <span className="text-xl font-extrabold text-status-online">{formatBdt(order.priceBdt)}</span>
            {order.quantity > 1 && <span className="ml-2 text-sm font-bold text-muted">× {order.quantity}</span>}
          </Row>
          <Row icon={ListChecks} label="Order status">
            <StatusPill status={order.status} refunded={order.refunded} />
          </Row>
        </dl>
      </section>

      {/* Delivered result */}
      {order.status === "completed" && order.result && (
        <Section icon={KeyRound} title="Your rent details">
          <OrderResult text={order.result} />
        </Section>
      )}
      {order.status !== "completed" && order.result && (
        <Section icon={Info} title="Message">
          <p className="text-sm whitespace-pre-line text-muted">{order.result}</p>
        </Section>
      )}

      {/* Parameters */}
      <Section icon={ListChecks} title="Order parameters">
        <ul className="grid gap-3 sm:grid-cols-2">
          {parameters.map(([name, value]) => (
            <li key={name} className="rounded-xl border border-line/40 bg-background/30 px-4 py-3">
              <p className="text-xs font-bold tracking-wider text-muted uppercase">{name}</p>
              <p className="mt-1 font-bold break-all">{value}</p>
            </li>
          ))}
        </ul>
      </Section>
      </div>

      {/* Timeline */}
      <div className="lg:sticky lg:top-24">
      <Section icon={Workflow} title="Order Status">
        <ol className="relative">
          {steps.map((step, index) => {
            const last = index === steps.length - 1;
            const Icon = step.icon;
            const waiting = step.state === "waiting";
            const active = !waiting && (last || step.state === "current");
            // Icon fill, its glow (halo + ring + coloured shadow), and the row's soft highlight.
            const tone =
              step.state === "failed"
                ? { icon: "bg-linear-to-br from-status-offline to-status-offline/80 shadow-status-offline/60 ring-status-offline/20", halo: "bg-status-offline/50", row: "from-status-offline/10" }
                : waiting
                  ? { icon: "border border-line/60 bg-background/40 text-muted shadow-none ring-transparent", halo: "", row: "" }
                  : active
                    ? { icon: "bg-linear-to-br from-primary to-purple shadow-primary/60 ring-primary/20", halo: "bg-primary/50", row: "from-primary/10" }
                    : { icon: "bg-linear-to-br from-status-online to-status-online/80 shadow-status-online/60 ring-status-online/20", halo: "bg-status-online/45", row: "from-status-online/10" };
            return (
              <li key={step.label} className="relative flex gap-4 pb-5 last:pb-0">
                {!last && (
                  <span
                    aria-hidden
                    className={`absolute top-11 left-[1.1rem] h-[calc(100%-2.75rem)] w-0.5 rounded-full ${
                      waiting || steps[index + 1]?.state === "waiting"
                        ? "bg-line/40"
                        : "bg-linear-to-b from-status-online to-status-online/40 shadow-[0_0_8px] shadow-status-online/70"
                    }`}
                  />
                )}
                <span className="relative shrink-0">
                  {tone.halo && (
                    <span aria-hidden className={`absolute -inset-1.5 rounded-full blur-md ${tone.halo} ${active ? "animate-pulse" : "opacity-70"}`} />
                  )}
                  <span
                    className={`relative flex size-9 items-center justify-center rounded-full text-white shadow-lg ring-4 ${tone.icon}`}
                  >
                    <Icon aria-hidden className={`size-4 ${step.state === "current" ? "animate-spin" : ""}`} strokeWidth={2.75} />
                  </span>
                </span>
                <div
                  className={`min-w-0 flex-1 rounded-xl px-3 py-1.5 ${tone.row ? `bg-linear-to-r ${tone.row} to-transparent` : ""}`}
                >
                  <p
                    className={`text-base font-bold ${
                      step.state === "failed"
                        ? "text-status-offline drop-shadow-[0_0_6px_color-mix(in_oklab,var(--color-status-offline)_45%,transparent)]"
                        : waiting
                          ? "text-muted"
                          : "text-status-online drop-shadow-[0_0_6px_color-mix(in_oklab,var(--color-status-online)_45%,transparent)]"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs font-semibold text-muted">
                    {step.at ? SHORT_DATE_TIME.format(new Date(step.at)) : step.state === "current" ? "In progress…" : "Waiting"}
                  </p>
                  {step.note && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                      {step.state === "failed" && <Undo2 aria-hidden className="size-3" />} {step.note}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Section>
      </div>
    </div>
  );
}
