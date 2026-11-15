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
import { formatBdt, OrderResult, OrderStatusBadge } from "@/components/rent/shared";
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
    if (first(["processing"])) steps.push({ label: "Processing", at: first(["processing"]), icon: Loader, state: "done" });
    steps.push({
      label: order.status === "rejected" ? "Rejected" : "Failed",
      at: finalAt ?? order.updatedAt,
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

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="neon-card overflow-hidden p-0">
      <h2 className="flex items-center gap-2.5 border-b border-line/30 px-5 py-3.5 font-display font-semibold">
        <Icon aria-hidden className="size-4.5 text-primary" /> {title}
      </h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Row({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[13rem_1fr] sm:items-center sm:gap-4">
      <dt className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
        <Icon aria-hidden className="size-3.5 text-primary" /> {label}
      </dt>
      <dd className="min-w-0 font-semibold wrap-break-word">{children}</dd>
    </div>
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
    <Link href="/account" className="btn-outline min-h-9! px-3! text-sm">
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
    <div className="space-y-5">
      {/* Details */}
      <section className="neon-card overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-line/30 px-5 py-3.5">
          <h1 className="flex items-center gap-2.5 font-display text-lg font-semibold">
            <Info aria-hidden className="size-5 text-primary" /> Order details
          </h1>
          {back}
        </div>
        <dl className="divide-y divide-line/25 px-5">
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
            <span className="text-lg text-status-online">{formatBdt(order.priceBdt)}</span>
            {order.quantity > 1 && <span className="ml-2 text-xs font-normal text-muted">× {order.quantity}</span>}
          </Row>
          <Row icon={ListChecks} label="Order status">
            <OrderStatusBadge status={order.status} refunded={order.refunded} />
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
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">{name}</p>
              <p className="mt-1 font-semibold break-all">{value}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Timeline */}
      <Section icon={Workflow} title="Order status">
        <ol className="relative">
          {steps.map((step, index) => {
            const last = index === steps.length - 1;
            const Icon = step.icon;
            const tone =
              step.state === "failed"
                ? "bg-status-offline text-white shadow-status-offline/40"
                : step.state === "waiting"
                  ? "border border-line/60 bg-background/40 text-muted shadow-none"
                  : last || step.state === "current"
                    ? "bg-primary text-white shadow-primary/50"
                    : "bg-status-online text-white shadow-status-online/40";
            return (
              <li key={step.label} className="relative flex gap-4 pb-6 last:pb-0">
                {!last && (
                  <span
                    aria-hidden
                    className={`absolute top-10 left-[1.1rem] h-[calc(100%-2.5rem)] w-0.5 ${
                      step.state === "waiting" ? "bg-line/40" : "bg-status-online/60"
                    }`}
                  />
                )}
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-full shadow-lg ${tone}`}>
                  <Icon aria-hidden className={`size-4 ${step.state === "current" ? "animate-spin" : ""}`} />
                </span>
                <div className="min-w-0 pt-1">
                  <p
                    className={`font-semibold ${
                      step.state === "failed" ? "text-status-offline" : step.state === "waiting" ? "text-muted" : "text-status-online"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted">
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
  );
}
