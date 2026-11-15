"use client";

import {
  ArrowRight,
  Ban,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader,
  Lock,
  LogOut,
  PlusCircle,
  Receipt,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { formatBdt, formatSignedBdt, OrderResult, OrderStatusBadge, TRANSACTION_LABELS } from "@/components/rent/shared";
import { RelativeTime } from "@/components/ui/relative-time";
import { useToast } from "@/components/ui/toast";
import { apiFetch, errorMessage } from "@/lib/client-api";
import type { BalanceTransactionDTO, RentOrderDTO, RentOrderStatsDTO } from "@/types";

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** e.g. "15 Nov 2026, 3:45 pm" in the viewer's time zone. */
function formatDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

interface Me {
  name: string;
  email: string;
  phone: string;
  balance: number;
}

/** While an order is open, the page refreshes itself this often so the customer never has to press Refresh. */
const POLL_MS = 10_000;
const RECENT_COUNT = 5;
const OPEN_STATUSES = ["submitting", "pending", "processing"];

/* ------------------------------------------------------------------- clock */

const CLOCK_TICK_MS = 15_000;
const subscribeClock = (onTick: () => void) => {
  const timer = setInterval(onTick, CLOCK_TICK_MS);
  return () => clearInterval(timer);
};
const getClock = () => Math.floor(Date.now() / CLOCK_TICK_MS) * CLOCK_TICK_MS;
const getServerClock = () => null;

function LiveDate() {
  const now = useSyncExternalStore(subscribeClock, getClock, getServerClock);
  if (now === null) return null;
  const date = new Date(now);
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays aria-hidden className="size-3.5" />
        {date.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock aria-hidden className="size-3.5" />
        {date.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </p>
  );
}

/* -------------------------------------------------------------- stat cards */

type Tone = "primary" | "purple" | "cyan" | "online" | "offline" | "maintenance";

const TONES: Record<Tone, { border: string; tile: string }> = {
  primary: { border: "border-l-primary", tile: "bg-primary/20 text-primary" },
  purple: { border: "border-l-purple", tile: "bg-purple/20 text-purple" },
  cyan: { border: "border-l-cyan", tile: "bg-cyan/15 text-cyan" },
  online: {
    border: "border-l-status-online",
    tile: "bg-status-online/15 text-status-online",
  },
  offline: {
    border: "border-l-status-offline",
    tile: "bg-status-offline/15 text-status-offline",
  },
  maintenance: {
    border: "border-l-status-maintenance",
    tile: "bg-status-maintenance/15 text-status-maintenance",
  },
};

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  hint: string;
  children?: React.ReactNode;
}) {
  const style = TONES[tone];
  return (
    <div className={`neon-card flex flex-col border-l-4 p-4 ${style.border}`}>
      <div className="flex items-center gap-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${style.tile}`}>
          <Icon aria-hidden className="size-4.5" />
        </span>
        <p className="text-xs leading-tight font-bold tracking-wide text-muted uppercase sm:text-[13px]">{label}</p>
      </div>
      <p className="mt-3 font-display text-3xl font-extrabold tabular-nums">{value}</p>
      <p className="text-sm font-semibold text-muted">{hint}</p>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ orders */

function OrderCard({ order }: { order: RentOrderDTO }) {
  return (
    // The whole card opens the order: the title link is stretched over it; the result box sits above it so copying still works.
    <li className="neon-card neon-card-hover group p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted">
            Order <span className="font-bold text-foreground">#{order.id.slice(-6).toUpperCase()}</span> ·{" "}
            <RelativeTime iso={order.createdAt} />
          </p>
          <h3 className="mt-0.5 text-lg leading-snug font-extrabold wrap-break-word">
            <Link
              href={`/account/orders/${order.id}`}
              className="after:absolute after:inset-0 after:rounded-[inherit] group-hover:text-cyan focus-visible:outline-none"
            >
              {order.serviceName}
            </Link>
          </h3>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-lg font-extrabold text-cyan tabular-nums">
            {formatBdt(order.priceBdt)}
            {order.quantity > 1 && <span className="text-xs font-normal text-muted"> · qty {order.quantity}</span>}
          </span>
          <OrderStatusBadge status={order.status} refunded={order.refunded} customer />
        </div>
      </div>
      {Object.keys(order.fields).length > 0 && (
        <dl className="mt-2 space-y-0.5 text-sm text-muted">
          {Object.entries(order.fields).map(([name, value]) => (
            <div key={name}>
              <dt className="inline">{name}: </dt>
              <dd className="inline break-all text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {order.status === "completed" ? (
        <div className="relative z-10">
          <OrderResult text={order.result} />
        </div>
      ) : order.result ? (
        <p className="mt-2 text-sm whitespace-pre-line text-muted">{order.result}</p>
      ) : OPEN_STATUSES.includes(order.status) ? (
        <p className="mt-2 text-sm text-muted">Your rent details will appear here as soon as they are ready.</p>
      ) : null}
      <p className="mt-3 flex justify-end">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-cyan group-hover:underline">
          View details <ArrowRight aria-hidden className="size-3.5" />
        </span>
      </p>
    </li>
  );
}

/* --------------------------------------------------------------- dashboard */

export function AccountDashboard({ contactUrl }: { contactUrl: string | null }) {
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<RentOrderDTO[] | null>(null);
  const [stats, setStats] = useState<RentOrderStatsDTO | null>(null);
  const [transactions, setTransactions] = useState<BalanceTransactionDTO[] | null>(null);
  const [wallet, setWallet] = useState({ totalAddedBdt: 0, depositCount: 0 });
  const [tab, setTab] = useState<"orders" | "wallet">("orders");
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  /** `silent` is for the automatic refresh: no spinner flicker or error toast every few seconds. */
  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [meData, orderData, txData] = await Promise.all([
          apiFetch<{ customer: Me }>("/api/me"),
          apiFetch<{ orders: RentOrderDTO[]; stats: RentOrderStatsDTO }>("/api/me/orders"),
          apiFetch<{
            transactions: BalanceTransactionDTO[];
            totalAddedBdt: number;
            depositCount: number;
          }>("/api/me/transactions"),
        ]);
        setMe(meData.customer);
        setOrders(orderData.orders);
        setStats(orderData.stats);
        setTransactions(txData.transactions);
        setWallet({
          totalAddedBdt: txData.totalAddedBdt,
          depositCount: txData.depositCount,
        });
      } catch (error) {
        if (!silent) toast.error(errorMessage(error));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    // Data comes from the API after mount, so this page needs no server session read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // While an order is still open, check back regularly so the login appears without a reload.
  const hasOpen = orders?.some((order) => OPEN_STATUSES.includes(order.status)) ?? false;
  useEffect(() => {
    if (!hasOpen) return;
    // Skip while the tab is in the background; catch up as soon as it is visible again.
    const tick = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [hasOpen, load]);

  async function signOut() {
    try {
      await apiFetch("/api/customer-auth/logout", { method: "POST" });
    } finally {
      // A full load, so no signed-in page stays in the router cache.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/services";
    }
  }

  if (!me) {
    return (
      <div role="status" aria-label="Loading" className="space-y-4">
        <div className="skeleton h-40" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="skeleton h-32" />
          ))}
        </div>
        <div className="skeleton h-64" />
      </div>
    );
  }

  const s = stats ?? {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    cancelled: 0,
    lockedBdt: 0,
    spentBdt: 0,
  };
  const visibleOrders = orders ? (showAll ? orders : orders.slice(0, RECENT_COUNT)) : [];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section className="neon-card overflow-hidden p-5 sm:p-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/25 via-purple/15 to-cyan/10"
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary to-purple font-display text-xl font-bold text-white shadow-lg shadow-primary/30">
              {me.name.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-muted">Welcome back</p>
              <h1 className="truncate font-display text-xl font-extrabold sm:text-2xl">{me.name}</h1>
              <p className="truncate text-sm text-muted">{me.email}</p>
            </div>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2">
            <div className="rounded-xl border border-line/60 bg-background/40 px-4 py-2.5">
              <p className="inline-flex items-center gap-1.5 text-xs text-muted">
                <Wallet aria-hidden className="size-3.5" /> Current balance
              </p>
              <p className="text-lg font-bold text-neon tabular-nums">{formatBdt(me.balance)}</p>
            </div>
            <div className="rounded-xl border border-line/60 bg-background/40 px-4 py-2.5">
              <p className="inline-flex items-center gap-1.5 text-xs text-muted">
                <ShoppingCart aria-hidden className="size-3.5" /> Total orders
              </p>
              <p className="text-lg font-bold tabular-nums">{s.total}</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <LiveDate />
        </div>
      </section>

      {/* Stats */}
      <section aria-label="Account summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Wallet} tone="primary" label="Current balance" value={formatBdt(me.balance)} hint="Available to spend">
          {contactUrl && (
            <a
              href={contactUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-neon mt-3 min-h-9! w-full px-3! text-xs sm:text-sm"
            >
              <PlusCircle aria-hidden className="size-4" /> Add balance
            </a>
          )}
        </StatCard>
        <StatCard icon={Receipt} tone="purple" label="Total spent" value={formatBdt(s.spentBdt)} hint="On completed orders" />
        <StatCard icon={ShoppingBag} tone="cyan" label="Total orders" value={String(s.total)} hint="All time orders" />
        <StatCard icon={Lock} tone="maintenance" label="Locked amount" value={formatBdt(s.lockedBdt)} hint="In processing" />
        <StatCard icon={Clock} tone="maintenance" label="Pending" value={String(s.pending)} hint="Pending orders" />
        <StatCard icon={Loader} tone="cyan" label="In process" value={String(s.processing)} hint="Active orders" />
        <StatCard icon={CheckCircle2} tone="online" label="Completed" value={String(s.completed)} hint="Finished orders" />
        <StatCard icon={Ban} tone="offline" label="Cancelled / Rejected" value={String(s.cancelled)} hint="Refunded or stopped" />
      </section>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div role="tablist" aria-label="Account" className="flex gap-1 rounded-full border border-line/50 p-1">
          {(["orders", "wallet"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition sm:flex-none ${
                tab === key ? "bg-primary text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {key === "orders" ? "Recent orders" : "Wallet history"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:flex-1">
          <button type="button" onClick={() => void load()} disabled={loading} className="btn-outline min-h-10! px-4! text-sm">
            <RefreshCw aria-hidden className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <Link href="/services" className="btn-neon min-h-10! px-4! text-sm">
            <ShoppingCart aria-hidden className="size-4" /> Rent a tool
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Sign out"
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
          >
            <LogOut aria-hidden className="size-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      {/* Orders / wallet */}
      {tab === "orders" ? (
        <section className="neon-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <ShoppingBag aria-hidden className="size-4.5" />
              </span>
              <div>
                <h2 className="font-display font-bold">{showAll ? "All orders" : "Recent orders"}</h2>
                <p className="text-xs text-muted">Your latest orders and their current status</p>
              </div>
            </div>
            {orders && orders.length > RECENT_COUNT && (
              <button type="button" onClick={() => setShowAll((value) => !value)} className="btn-neon min-h-9! px-4! text-sm">
                {showAll ? "Show less" : "View all"} <ArrowRight aria-hidden className="size-4" />
              </button>
            )}
          </div>
          {visibleOrders.length > 0 ? (
            <ul className="space-y-3">
              {visibleOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-muted">You have no orders yet.</p>
          )}
        </section>
      ) : (
        <section className="neon-card p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <Wallet aria-hidden className="size-4.5" />
              </span>
              <div>
                <h2 className="font-display font-bold">Wallet history</h2>
                <p className="text-xs text-muted">When and how much money was added to your balance</p>
              </div>
            </div>
            <div className="rounded-xl border border-line/60 bg-background/40 px-4 py-2 text-right">
              <p className="text-xs text-muted">
                Total added
                {wallet.depositCount > 0 && ` · ${wallet.depositCount} time${wallet.depositCount === 1 ? "" : "s"}`}
              </p>
              <p className="text-lg font-bold text-status-online tabular-nums">{formatBdt(wallet.totalAddedBdt)}</p>
            </div>
          </div>
          {transactions && transactions.length > 0 ? (
            <ul className="divide-y divide-line/30">
              {transactions.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{TRANSACTION_LABELS[tx.type]}</p>
                    <p className="inline-flex items-center gap-1.5 text-sm text-muted">
                      <CalendarDays aria-hidden className="size-3.5 shrink-0" />
                      {formatDateTime(tx.createdAt)} · <RelativeTime iso={tx.createdAt} />
                    </p>
                    {tx.note && <p className="truncate text-xs text-muted">{tx.note}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`font-semibold tabular-nums ${tx.amount > 0 ? "text-status-online" : "text-status-offline"}`}>
                      {formatSignedBdt(tx.amount)}
                    </p>
                    <p className="text-xs text-muted">Balance {formatBdt(tx.balanceAfter)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-muted">No money has been added to your balance yet.</p>
          )}
        </section>
      )}
    </div>
  );
}
