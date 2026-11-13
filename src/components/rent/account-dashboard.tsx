"use client";

import { LogOut, RefreshCw, ShoppingCart, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  formatBdt,
  formatSignedBdt,
  OrderResult,
  OrderStatusBadge,
  TRANSACTION_LABELS,
} from "@/components/rent/shared";
import { RelativeTime } from "@/components/ui/relative-time";
import { useToast } from "@/components/ui/toast";
import { apiFetch, errorMessage } from "@/lib/client-api";
import type { BalanceTransactionDTO, RentOrderDTO } from "@/types";

interface Me {
  name: string;
  email: string;
  phone: string;
  balance: number;
}

const POLL_MS = 20_000;

export function AccountDashboard({ contactUrl }: { contactUrl: string | null }) {
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<RentOrderDTO[] | null>(null);
  const [transactions, setTransactions] = useState<BalanceTransactionDTO[] | null>(null);
  const [tab, setTab] = useState<"orders" | "wallet">("orders");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [meData, orderData, txData] = await Promise.all([
        apiFetch<{ customer: Me }>("/api/me"),
        apiFetch<{ orders: RentOrderDTO[] }>("/api/me/orders"),
        apiFetch<{ transactions: BalanceTransactionDTO[] }>("/api/me/transactions"),
      ]);
      setMe(meData.customer);
      setOrders(orderData.orders);
      setTransactions(txData.transactions);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Data comes from the API after mount, so this page needs no server session read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // While an order is still open, check back regularly so the login appears without a reload.
  const hasOpen = orders?.some((order) => ["submitting", "pending", "processing"].includes(order.status)) ?? false;
  useEffect(() => {
    if (!hasOpen) return;
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [hasOpen, load]);

  async function signOut() {
    try {
      await apiFetch("/api/customer-auth/logout", { method: "POST" });
    } finally {
      // A full load, so no signed-in page stays in the router cache.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/rent";
    }
  }

  if (!me) {
    return (
      <div role="status" aria-label="Loading" className="space-y-4">
        <div className="skeleton h-32" />
        <div className="skeleton h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="neon-card flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted">Signed in as</p>
          <h1 className="truncate font-display text-xl font-bold">{me.name}</h1>
          <p className="truncate text-sm text-muted">{me.email}</p>
        </div>
        <div className="sm:text-right">
          <p className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Wallet aria-hidden className="size-4" /> Balance
          </p>
          <p className="text-3xl font-bold text-neon">{formatBdt(me.balance)}</p>
          {contactUrl && (
            <a href={contactUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-cyan hover:underline">
              Add balance – contact us
            </a>
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Account" className="flex gap-1 rounded-full border border-line/50 p-1">
          {(["orders", "wallet"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === key ? "bg-primary text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {key === "orders" ? "My orders" : "Wallet history"}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="btn-outline min-h-10! px-4! text-sm">
          <RefreshCw aria-hidden className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
        <Link href="/rent" className="btn-neon min-h-10! px-4! text-sm">
          <ShoppingCart aria-hidden className="size-4" /> Rent a tool
        </Link>
        <button type="button" onClick={() => void signOut()} className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
          <LogOut aria-hidden className="size-4" /> Sign out
        </button>
      </div>

      {tab === "orders" ? (
        orders && orders.length > 0 ? (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id} className="neon-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-semibold">{order.serviceName}</h2>
                    <p className="text-sm text-muted">
                      {formatBdt(order.priceBdt)} · <RelativeTime iso={order.createdAt} />
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} refunded={order.refunded} />
                </div>
                {Object.keys(order.fields).length > 0 && (
                  <dl className="mt-2 space-y-0.5 text-sm text-muted">
                    {Object.entries(order.fields).map(([name, value]) => (
                      <div key={name}>
                        <dt className="inline">{name}: </dt>
                        <dd className="inline text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {order.status === "completed" ? (
                  <OrderResult text={order.result} />
                ) : order.result ? (
                  <p className="mt-2 text-sm whitespace-pre-line text-muted">{order.result}</p>
                ) : ["submitting", "pending", "processing"].includes(order.status) ? (
                  <p className="mt-2 text-sm text-muted">Your rent details will appear here as soon as they are ready.</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="neon-card p-8 text-center text-muted">You have no orders yet.</p>
        )
      ) : transactions && transactions.length > 0 ? (
        <ul className="neon-card divide-y divide-line/30">
          {transactions.map((tx) => (
            <li key={tx.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">{TRANSACTION_LABELS[tx.type]}</p>
                <p className="truncate text-sm text-muted">
                  {tx.note && `${tx.note} · `}
                  <RelativeTime iso={tx.createdAt} />
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`font-semibold ${tx.amount > 0 ? "text-status-online" : "text-status-offline"}`}>
                  {formatSignedBdt(tx.amount)}
                </p>
                <p className="text-xs text-muted">Balance {formatBdt(tx.balanceAfter)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="neon-card p-8 text-center text-muted">No wallet activity yet.</p>
      )}
    </div>
  );
}
