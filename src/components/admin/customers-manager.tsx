"use client";

import { Search, Wallet } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { AdminEmpty, ListSkeleton, LoadError, PageHeader, SelectField, TextField, Toggle } from "@/components/admin/form";
import {
  formatBdt,
  formatSignedBdt,
  OrderResult,
  OrderStatusBadge,
  TRANSACTION_LABELS,
} from "@/components/rent/shared";
import { Modal } from "@/components/ui/modal";
import { RelativeTime } from "@/components/ui/relative-time";
import { useToast } from "@/components/ui/toast";
import { useResource } from "@/hooks/use-resource";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf } from "@/lib/client-api";
import type { BalanceTransactionDTO, CustomerDTO, RentOrderDTO } from "@/types";

type ListData = { customers: CustomerDTO[]; total: number; page: number; pageSize: number };
type Detail = { customer: CustomerDTO; transactions: BalanceTransactionDTO[]; orders: RentOrderDTO[] };

function BalanceForm({ customer, onDone }: { customer: CustomerDTO; onDone: (balance: number) => void }) {
  const [direction, setDirection] = useState<"add" | "deduct">("add");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!amount || !Number.isInteger(value) || value <= 0) {
      setErrors({ amount: "Enter a whole number of taka above 0" });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const result = await apiFetch<{ balance: number }>(`/api/customers/${customer.id}/balance`, {
        method: "POST",
        body: { amount: direction === "add" ? value : -value, note },
      });
      toast.success(`${direction === "add" ? "Added" : "Deducted"} ${formatBdt(value)}. New balance ${formatBdt(result.balance)}.`);
      setAmount("");
      setNote("");
      onDone(result.balance);
    } catch (error) {
      setErrors(fieldErrorsOf(error));
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-lg border border-admin-line p-4">
      <h3 className="font-medium">Adjust balance</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Action"
          value={direction}
          onChange={setDirection}
          options={[
            { value: "add", label: "Add balance" },
            { value: "deduct", label: "Deduct balance" },
          ]}
        />
        <TextField
          label="Amount (BDT)"
          type="number"
          value={amount}
          onChange={(value) => {
            setAmount(value);
            setErrors((current) => clearFieldError(current, "amount"));
          }}
          error={errors.amount}
          required
        />
      </div>
      <TextField
        label="Note"
        placeholder="e.g. bKash TrxID 8A7B6C5D"
        hint="Shown to the customer in their wallet history."
        value={note}
        onChange={setNote}
        error={errors.note}
      />
      <div className="flex justify-end">
        <button type="submit" disabled={busy} className={`admin-btn ${direction === "add" ? "admin-btn-primary" : "admin-btn-danger"}`}>
          <Wallet aria-hidden className="size-4" />
          {busy ? "Saving…" : direction === "add" ? "Add balance" : "Deduct balance"}
        </button>
      </div>
    </form>
  );
}

function CustomerDetail({ id, onChanged }: { id: string; onChanged: (customer: CustomerDTO) => void }) {
  const { data, error, loading, reload, setData } = useResource<Detail>(`/api/customers/${id}`);
  const [tab, setTab] = useState<"wallet" | "orders">("wallet");
  const toast = useToast();

  if (loading) return <ListSkeleton rows={3} />;
  if (error || !data) return <LoadError message={error ?? "Could not load this customer."} onRetry={reload} />;
  const { customer } = data;

  async function setActive(active: boolean) {
    try {
      const result = await apiFetch<{ customer: CustomerDTO }>(`/api/customers/${id}`, { method: "PATCH", body: { active } });
      setData((current) => current && { ...current, customer: result.customer });
      onChanged(result.customer);
      toast.success(active ? "Customer unblocked." : "Customer blocked and signed out.");
    } catch (patchError) {
      toast.error(errorMessage(patchError));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="text-sm">
          <p className="text-admin-muted">{customer.email}</p>
          <p className="text-admin-muted">{customer.phone || "No phone"}</p>
          <p className="mt-1 text-2xl font-semibold">{formatBdt(customer.balance)}</p>
        </div>
        <Toggle label={customer.active ? "Active" : "Blocked"} checked={customer.active} onChange={(value) => void setActive(value)} />
      </div>

      <BalanceForm
        customer={customer}
        onDone={(balance) => {
          onChanged({ ...customer, balance });
          reload();
        }}
      />

      <div className="flex gap-1 border-b border-admin-line">
        {(["wallet", "orders"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === key ? "border-primary text-admin-text" : "border-transparent text-admin-muted"}`}
          >
            {key === "wallet" ? `Wallet (${data.transactions.length})` : `Orders (${data.orders.length})`}
          </button>
        ))}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {tab === "wallet" ? (
          data.transactions.length === 0 ? (
            <p className="py-4 text-center text-sm text-admin-muted">No wallet activity yet.</p>
          ) : (
            <ul className="divide-y divide-admin-line text-sm">
              {data.transactions.map((tx) => (
                <li key={tx.id} className="flex justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p>{TRANSACTION_LABELS[tx.type]}</p>
                    <p className="truncate text-xs text-admin-muted">
                      {tx.note && `${tx.note} · `}
                      <RelativeTime iso={tx.createdAt} />
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={tx.amount > 0 ? "text-status-online" : "text-status-offline"}>{formatSignedBdt(tx.amount)}</p>
                    <p className="text-xs text-admin-muted">{formatBdt(tx.balanceAfter)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : data.orders.length === 0 ? (
          <p className="py-4 text-center text-sm text-admin-muted">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-admin-line text-sm">
            {data.orders.map((order) => (
              <li key={order.id} className="py-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <span>{order.serviceName}</span>
                  <OrderStatusBadge status={order.status} refunded={order.refunded} />
                </div>
                <p className="text-xs text-admin-muted">
                  {formatBdt(order.priceBdt)} · <RelativeTime iso={order.createdAt} />
                </p>
                {order.status === "completed" && <OrderResult text={order.result} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function CustomersManager() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, error, loading, reload, setData } = useResource<ListData>(
    `/api/customers?q=${encodeURIComponent(search)}&page=${page}`,
  );
  const [selected, setSelected] = useState<CustomerDTO | null>(null);

  // Searches a moment after typing stops, rather than on every key press.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const updateRow = (customer: CustomerDTO) =>
    setData((current) => current && { ...current, customers: current.customers.map((c) => (c.id === customer.id ? customer : c)) });

  return (
    <>
      <PageHeader title="Customers" description="Registered website users. Open one to add balance after they pay you." />

      <label className="relative mb-4 block">
        <span className="sr-only">Search customers</span>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-admin-muted" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, email or phone"
          className="admin-input pl-9!"
        />
      </label>

      {loading && !data ? (
        <ListSkeleton />
      ) : error && !data ? (
        <LoadError message={error} onRetry={reload} />
      ) : !data || data.customers.length === 0 ? (
        <AdminEmpty
          title={search ? "No customers match" : "No customers yet"}
          message={search ? "Try another search." : "Customers appear here after they register on the website."}
        />
      ) : (
        <>
          <p className="mb-2 text-sm text-admin-muted">{data.total} customers</p>
          <ul className="space-y-2">
            {data.customers.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => setSelected(customer)}
                  className={`admin-card flex w-full items-center gap-3 p-3 text-left transition hover:border-primary ${
                    customer.active ? "" : "opacity-60"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {customer.name}
                      {!customer.active && <span className="ml-2 text-xs text-status-offline">Blocked</span>}
                    </p>
                    <p className="truncate text-sm text-admin-muted">
                      {customer.email}
                      {customer.phone && ` · ${customer.phone}`}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold">{formatBdt(customer.balance)}</span>
                </button>
              </li>
            ))}
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

      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected?.name ?? "Customer"} className="max-w-2xl">
        {selected && (
          <CustomerDetail
            key={selected.id}
            id={selected.id}
            onChanged={(customer) => {
              updateRow(customer);
              setSelected(customer);
            }}
          />
        )}
      </Modal>
    </>
  );
}
