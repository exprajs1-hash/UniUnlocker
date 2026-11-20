"use client";

import { Pencil, RefreshCw, Undo2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { AdminEmpty, ListSkeleton, LoadError, PageHeader, SelectField, TextAreaField, TextField, Toggle } from "@/components/admin/form";
import { formatBdt, ORDER_STATUS_LABELS, OrderResult, OrderStatusBadge } from "@/components/rent/shared";
import { formatCost } from "@/lib/pricing";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { RelativeTime } from "@/components/ui/relative-time";
import { useToast } from "@/components/ui/toast";
import { useResource } from "@/hooks/use-resource";
import { apiFetch, errorMessage, fieldErrorsOf } from "@/lib/client-api";
import {
  MANUAL_ORDER_STATUSES,
  RENT_ORDER_STATUSES,
  type AdminRentOrderDTO,
  type ManualOrderStatus,
  type RentOrderStatus,
} from "@/types";

type Data = { orders: AdminRentOrderDTO[]; total: number; page: number; pageSize: number };

const OPEN_STATUSES: RentOrderStatus[] = ["submitting", "pending", "processing"];
/** While open orders are on screen, reload (which also checks them with the provider) this often. */
const POLL_MS = 60_000;

const STATUS_HINTS: Record<ManualOrderStatus, string> = {
  pending: "Waiting at the provider. Checked automatically if it has a provider order id.",
  processing: "Being worked on. Checked automatically if it has a provider order id.",
  completed: "Delivered. The customer sees the result below on their account page.",
  rejected: "The provider refused it.",
  failed: "It will not be delivered.",
};

export function RentOrdersManager() {
  const [status, setStatus] = useState<RentOrderStatus | "">("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useResource<Data>(`/api/rent-orders?status=${status}&page=${page}`);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<AdminRentOrderDTO | null>(null);
  const [editing, setEditing] = useState<AdminRentOrderDTO | null>(null);
  const toast = useToast();

  // Auto mode: keep checking open orders with the provider while this page is open.
  const hasOpen = data?.orders.some((order) => OPEN_STATUSES.includes(order.status)) ?? false;
  useEffect(() => {
    if (!hasOpen || editing) return;
    const timer = setInterval(reload, POLL_MS);
    return () => clearInterval(timer);
  }, [hasOpen, editing, reload]);

  async function act(order: AdminRentOrderDTO, action: "refresh" | "refund") {
    setBusyId(order.id);
    try {
      const reply = await apiFetch<{ message?: string }>(`/api/rent-orders/${order.id}`, { method: "POST", body: { action } });
      toast.success(
        action === "refresh"
          ? (reply.message ?? "Status checked.")
          : `Refunded ${formatBdt(order.priceBdt)} to ${order.customer?.name ?? "the customer"}.`,
      );
      setRefunding(null);
      reload();
    } catch (actionError) {
      toast.error(errorMessage(actionError));
      if (action === "refresh") reload(); // shows the saved check error
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageHeader
        title="Rent orders"
        description="Open orders are checked with the provider automatically (on load and every minute while this page is open). If the provider finished an order but it is still open here, use Update status to complete it by hand."
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
              const open = OPEN_STATUSES.includes(order.status);
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
                        Charged {formatBdt(order.priceBdt)}
                        {!order.manual && <> · cost {formatCost(order.costUsd, order.costCurrency)}</>} ·{order.providerName} service #{order.serviceId}
                        {order.providerOrderId && ` · provider order #${order.providerOrderId}`}
                      </p>
                      {open && order.providerOrderId && (
                        <p className="text-xs text-admin-muted">
                          Auto check:{" "}
                          {order.lastCheckedAt ? (
                            <>
                              last <RelativeTime iso={order.lastCheckedAt} />
                              {order.providerStatus && ` · provider status "${order.providerStatus}"`}
                            </>
                          ) : (
                            "not checked yet"
                          )}
                        </p>
                      )}
                    </div>
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <OrderStatusBadge status={order.status} refunded={order.refunded} />
                      {order.manual && (
                        <span className="rounded-full bg-purple/15 px-2.5 py-0.5 text-xs font-semibold text-purple">Custom: deliver by hand</span>
                      )}
                      {order.manualAt && (
                        <span className="rounded-full bg-glass/10 px-2.5 py-0.5 text-xs font-semibold" title={`Updated by hand ${order.manualAt}`}>
                          Manual
                        </span>
                      )}
                    </span>
                  </div>

                  {Object.keys(order.fields).length > 0 && (
                    <p className="mt-2 text-sm">
                      {Object.entries(order.fields)
                        .map(([name, value]) => `${name}: ${value}`)
                        .join(" · ")}
                    </p>
                  )}
                  {order.status === "completed" ? (
                    <OrderResult text={order.result} order={order} />
                  ) : (
                    order.result && <p className="mt-2 text-sm whitespace-pre-line text-admin-muted">{order.result}</p>
                  )}
                  {order.providerReply && (
                    <details className="mt-2 text-xs text-admin-muted">
                      <summary className="cursor-pointer select-none">Provider reply (what the provider sent)</summary>
                      <pre className="mt-1 max-h-60 overflow-auto rounded-md bg-admin-line/20 p-2 whitespace-pre-wrap break-all">
                        {order.providerReply}
                      </pre>
                    </details>
                  )}
                  {open && order.checkError && (
                    <p className="mt-2 rounded-md bg-status-offline/10 px-3 py-2 text-xs text-status-offline">
                      Automatic status check failed: {order.checkError}. If the provider shows this order as done, use
                      Update status to complete it by hand.
                    </p>
                  )}
                  {order.adminNote && (
                    <p className="mt-2 rounded-md bg-status-maintenance/10 px-3 py-2 text-xs whitespace-pre-line text-status-maintenance">
                      Note: {order.adminNote}
                    </p>
                  )}
                  {order.status === "submitting" && (
                    <p className="mt-2 text-xs text-admin-muted">
                      The provider could not be reached while ordering. Check your provider panel: if the order is there,
                      use Update status to enter its order id (or complete it by hand); if not, refund it.
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === order.id}
                      onClick={() => setEditing(order)}
                      className="admin-btn admin-btn-secondary"
                    >
                      <Pencil aria-hidden className="size-4" /> {order.status === "completed" ? "Edit result" : "Update status"}
                    </button>
                    {order.providerOrderId && (order.status === "pending" || order.status === "processing") && (
                      <button
                        type="button"
                        disabled={busyId === order.id}
                        onClick={() => void act(order, "refresh")}
                        className="admin-btn admin-btn-secondary"
                      >
                        <RefreshCw aria-hidden className="size-4" /> Check status
                      </button>
                    )}
                    {!order.refunded && order.status !== "completed" && (
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

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Update: ${editing.serviceName}` : "Update order"} className="max-w-xl">
        {editing && (
          <ManualStatusForm
            key={editing.id}
            order={editing}
            onCancel={() => setEditing(null)}
            onSaved={(message) => {
              toast.success(message);
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>

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

function ManualStatusForm({
  order,
  onCancel,
  onSaved,
}: {
  order: AdminRentOrderDTO;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  // Open orders default to "completed", the usual reason to open this form.
  const [status, setStatus] = useState<ManualOrderStatus>(
    OPEN_STATUSES.includes(order.status) ? "completed" : (order.status as ManualOrderStatus),
  );
  const [result, setResult] = useState(order.result);
  const [providerOrderId, setProviderOrderId] = useState(order.providerOrderId);
  const [refund, setRefund] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const closing = status === "rejected" || status === "failed";
  const blockedByRefund = order.refunded && !closing;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError("");
    try {
      const reply = await apiFetch<{ refunded: boolean }>(`/api/rent-orders/${order.id}`, {
        method: "POST",
        body: { action: "update", status, result, providerOrderId, refund: closing && refund },
      });
      onSaved(
        reply.refunded
          ? `Marked ${status} and refunded ${formatBdt(order.priceBdt)}.`
          : `Order marked ${ORDER_STATUS_LABELS[status].toLowerCase()}.`,
      );
    } catch (submitError) {
      setErrors(fieldErrorsOf(submitError));
      setFormError(errorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-sm text-admin-muted">
        {order.customer ? `${order.customer.name} · ` : ""}
        {formatBdt(order.priceBdt)} · now <strong>{ORDER_STATUS_LABELS[order.status]}</strong>
        {order.refunded && " (refunded)"}
      </p>

      <div>
        <SelectField
          label="Status"
          value={status}
          onChange={setStatus}
          options={MANUAL_ORDER_STATUSES.map((value) => ({ value, label: ORDER_STATUS_LABELS[value] }))}
          error={errors.status}
        />
        <p className="mt-1 text-xs text-admin-muted">{STATUS_HINTS[status]}</p>
      </div>

      <TextAreaField
        label={status === "completed" ? "Result for the customer (required)" : "Message for the customer (optional)"}
        value={result}
        onChange={setResult}
        rows={5}
        error={errors.result}
        hint={
          status === "completed"
            ? "What the tool/provider delivered, e.g. User ID: abc123 / Password: xyz789 (one per line)."
            : "Shown on the customer's order, e.g. why it was rejected."
        }
      />
      {status === "completed" && !result && (
        <button
          type="button"
          onClick={() => setResult("User ID: \nPassword: ")}
          className="text-xs text-cyan underline underline-offset-2"
        >
          Insert User ID / Password template
        </button>
      )}

      <TextField
        label="Provider order id"
        value={providerOrderId}
        onChange={setProviderOrderId}
        error={errors.providerOrderId}
        hint="Pending/processing orders with this id keep being checked with the provider automatically."
      />

      {closing && !order.refunded && (
        <Toggle label={`Refund ${formatBdt(order.priceBdt)} to the customer's balance`} checked={refund} onChange={setRefund} />
      )}
      {closing && !order.refunded && !refund && (
        <p className="text-xs text-status-maintenance">The customer will not get their money back.</p>
      )}
      {order.status === "completed" && closing && refund && (
        <p className="text-xs text-status-maintenance">This reverses a completed order and returns the money.</p>
      )}
      {blockedByRefund && (
        <p className="text-xs text-status-offline">This order was refunded, so it can only be marked rejected or failed.</p>
      )}
      {formError && <p className="text-sm text-status-offline">{formError}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={busy || blockedByRefund} className="admin-btn admin-btn-primary">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
