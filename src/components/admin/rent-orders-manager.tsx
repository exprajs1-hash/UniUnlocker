"use client";

import { RefreshCw, Undo2 } from "lucide-react";
import { useState } from "react";
import { AdminEmpty, ListSkeleton, LoadError, PageHeader } from "@/components/admin/form";
import { formatBdt, ORDER_STATUS_LABELS, OrderResult, OrderStatusBadge } from "@/components/rent/shared";
import { ConfirmDialog } from "@/components/ui/modal";
import { RelativeTime } from "@/components/ui/relative-time";
import { useToast } from "@/components/ui/toast";
import { useResource } from "@/hooks/use-resource";
import { apiFetch, errorMessage } from "@/lib/client-api";
import { RENT_ORDER_STATUSES, type AdminRentOrderDTO, type RentOrderStatus } from "@/types";

type Data = { orders: AdminRentOrderDTO[]; total: number; page: number; pageSize: number };

export function RentOrdersManager() {
  const [status, setStatus] = useState<RentOrderStatus | "">("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useResource<Data>(`/api/rent-orders?status=${status}&page=${page}`);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<AdminRentOrderDTO | null>(null);
  const toast = useToast();

  async function act(order: AdminRentOrderDTO, action: "refresh" | "refund") {
    setBusyId(order.id);
    try {
      await apiFetch(`/api/rent-orders/${order.id}`, { method: "POST", body: { action } });
      toast.success(action === "refresh" ? "Status checked." : `Refunded ${formatBdt(order.priceBdt)} to ${order.customer?.name ?? "the customer"}.`);
      setRefunding(null);
      reload();
    } catch (actionError) {
      toast.error(errorMessage(actionError));
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHeader
        title="Rent orders"
        description="Orders customers placed. Open orders are checked with the provider each time this page loads."
        action={
          <button type="button" onClick={reload} className="admin-btn admin-btn-secondary">
            <RefreshCw aria-hidden className="size-4" /> Reload
          </button>
        }
      />

      <label className="mb-4 block sm:w-60">
        <span className="sr-only">Filter by status</span>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as RentOrderStatus | "");
            setPage(1);
          }}
          className="admin-input"
        >
          <option value="">All statuses</option>
          {RENT_ORDER_STATUSES.map((value) => (
            <option key={value} value={value}>
              {ORDER_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      {loading && !data ? (
        <ListSkeleton />
      ) : error && !data ? (
        <LoadError message={error} onRetry={reload} />
      ) : !data || data.orders.length === 0 ? (
        <AdminEmpty title="No orders" message="Orders appear here when customers rent a tool." />
      ) : (
        <>
          <ul className="space-y-3">
            {data.orders.map((order) => {
              const open = ["submitting", "pending", "processing"].includes(order.status);
              return (
                <li key={order.id} className="admin-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{order.serviceName}</p>
                      <p className="text-sm text-admin-muted">
                        {order.customer ? `${order.customer.name} (${order.customer.email})` : "Deleted customer"} ·{" "}
                        <RelativeTime iso={order.createdAt} />
                      </p>
                      <p className="text-xs text-admin-muted">
                        Charged {formatBdt(order.priceBdt)} · cost ${order.costUsd} · service #{order.serviceId}
                        {order.providerOrderId && ` · provider order #${order.providerOrderId}`}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} refunded={order.refunded} />
                  </div>

                  {Object.keys(order.fields).length > 0 && (
                    <p className="mt-2 text-sm">
                      {Object.entries(order.fields)
                        .map(([name, value]) => `${name}: ${value}`)
                        .join(" · ")}
                    </p>
                  )}
                  {order.status === "completed" ? (
                    <OrderResult text={order.result} />
                  ) : (
                    order.result && <p className="mt-2 text-sm whitespace-pre-line text-admin-muted">{order.result}</p>
                  )}
                  {order.adminNote && (
                    <p className="mt-2 rounded-md bg-status-maintenance/10 px-3 py-2 text-xs text-status-maintenance">
                      Provider: {order.adminNote}
                    </p>
                  )}
                  {order.status === "submitting" && (
                    <p className="mt-2 text-xs text-admin-muted">
                      The provider could not be reached while ordering. Check your provider panel: if the order is not
                      there, refund it.
                    </p>
                  )}

                  {(open || (!order.refunded && order.status !== "completed")) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {order.providerOrderId && open && (
                        <button
                          type="button"
                          disabled={busyId === order.id}
                          onClick={() => void act(order, "refresh")}
                          className="admin-btn admin-btn-secondary"
                        >
                          <RefreshCw aria-hidden className="size-4" /> Check status
                        </button>
                      )}
                      {!order.refunded && (
                        <button
                          type="button"
                          disabled={busyId === order.id}
                          onClick={() => setRefunding(order)}
                          className="admin-btn admin-btn-danger"
                        >
                          <Undo2 aria-hidden className="size-4" /> Refund
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="admin-btn admin-btn-secondary">
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="admin-btn admin-btn-secondary">
                Next
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={refunding !== null}
        title="Refund this order?"
        message={`${formatBdt(refunding?.priceBdt ?? 0)} goes back to ${refunding?.customer?.name ?? "the customer"}'s balance and the order is marked failed. Only do this if the provider will not deliver it.`}
        confirmLabel="Refund"
        busy={busyId !== null}
        onCancel={() => setRefunding(null)}
        onConfirm={() => refunding && void act(refunding, "refund")}
      />
    </>
  );
}
