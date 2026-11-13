"use client";

import { Clock, LogIn, Search, ShoppingCart, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { formatBdt } from "@/components/rent/shared";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ApiClientError, clearFieldError, errorMessage, fieldErrorsOf } from "@/lib/client-api";
import type { PublicRentServiceDTO, RentOrderDTO } from "@/types";

interface Me {
  name: string;
  balance: number;
}

/** Signed-in customer or null, without the redirect apiFetch does on 401. */
async function fetchMe(): Promise<Me | null> {
  try {
    const response = await fetch("/api/me", { cache: "no-store" });
    if (!response.ok) return null;
    return ((await response.json()) as { customer: Me }).customer;
  } catch {
    return null;
  }
}

function OrderForm({
  service,
  me,
  ordersEnabled,
  onDone,
  onCancel,
}: {
  service: PublicRentServiceDTO;
  me: Me | null;
  ordersEnabled: boolean;
  onDone: (balance: number) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  if (!me) {
    const next = encodeURIComponent("/rent");
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-admin-muted">Sign in or create a free account to rent this tool.</p>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Link href={`/login?next=${next}`} className="admin-btn admin-btn-primary">
            <LogIn aria-hidden className="size-4" /> Sign in
          </Link>
          <Link href={`/register?next=${next}`} className="admin-btn admin-btn-secondary">
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const shortBy = service.priceBdt - me.balance;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      const result = await apiFetch<{ order: RentOrderDTO; balance: number; message: string }>("/api/me/orders", {
        method: "POST",
        body: { serviceId: service.id, fields },
      });
      toast.success(result.message);
      onDone(result.balance);
    } catch (submitError) {
      setErrors(fieldErrorsOf(submitError));
      setError(errorMessage(submitError));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-admin-bg p-3 text-sm">
        <div>
          <dt className="text-admin-muted">Price</dt>
          <dd className="text-lg font-semibold">{formatBdt(service.priceBdt)}</dd>
        </div>
        <div>
          <dt className="text-admin-muted">Your balance</dt>
          <dd className={`text-lg font-semibold ${shortBy > 0 ? "text-status-offline" : "text-status-online"}`}>
            {formatBdt(me.balance)}
          </dd>
        </div>
      </dl>

      {service.info && <p className="text-sm whitespace-pre-line text-admin-muted">{service.info}</p>}

      {service.customFields.map((field) => {
        const id = `field-${field.name}`;
        const fieldError = errors[field.name];
        const common = {
          id,
          value: fields[field.name] ?? "",
          "aria-invalid": Boolean(fieldError),
          className: "admin-input",
          onChange: (event: { target: { value: string } }) => {
            const value = event.target.value;
            setFields((current) => ({ ...current, [field.name]: value }));
            setErrors((current) => clearFieldError(current, field.name));
          },
        };
        return (
          <div key={field.name}>
            <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
              {field.name}
              {field.required && <span className="text-status-offline"> *</span>}
            </label>
            {field.options.length > 0 ? (
              <select {...common}>
                <option value="">Choose…</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input {...common} type="text" maxLength={300} />
            )}
            {fieldError && <p className="mt-1 text-xs text-status-offline">{fieldError}</p>}
          </div>
        );
      })}

      {error && (
        <p role="alert" className="rounded-md border border-status-offline/40 bg-status-offline/10 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {!ordersEnabled ? (
        <p className="rounded-md bg-status-maintenance/10 px-3 py-2 text-sm text-status-maintenance">
          New orders are paused right now. Please check back soon.
        </p>
      ) : shortBy > 0 ? (
        <p className="rounded-md bg-status-maintenance/10 px-3 py-2 text-sm text-status-maintenance">
          You need {formatBdt(shortBy)} more. Contact us to add balance to your account.
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={busy || shortBy > 0 || !ordersEnabled} className="admin-btn admin-btn-primary">
          <ShoppingCart aria-hidden className="size-4" />
          {busy ? "Ordering…" : `Rent for ${formatBdt(service.priceBdt)}`}
        </button>
      </div>
    </form>
  );
}

export function RentCatalog() {
  const [services, setServices] = useState<PublicRentServiceDTO[] | null>(null);
  const [ordersEnabled, setOrdersEnabled] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [ordering, setOrdering] = useState<PublicRentServiceDTO | null>(null);
  const router = useRouter();

  useEffect(() => {
    let active = true;
    apiFetch<{ services: PublicRentServiceDTO[]; ordersEnabled: boolean }>("/api/rent/services")
      .then((data) => {
        if (!active) return;
        setServices(data.services);
        setOrdersEnabled(data.ordersEnabled);
      })
      .catch((error: unknown) => active && setLoadError(error instanceof ApiClientError ? error.message : errorMessage(error)));
    void fetchMe().then((value) => active && setMe(value));
    return () => {
      active = false;
    };
  }, []);

  const groups = useMemo(() => [...new Set((services ?? []).map((service) => service.group).filter(Boolean))].sort(), [services]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (services ?? []).filter(
      (service) => (!group || service.group === group) && (!needle || service.name.toLowerCase().includes(needle)),
    );
  }, [services, query, group]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search tools</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tools, e.g. Unlock Tool"
            className="neon-input pl-9!"
          />
        </label>
        {groups.length > 1 && (
          <label className="sm:w-56">
            <span className="sr-only">Filter by group</span>
            <select value={group} onChange={(event) => setGroup(event.target.value)} className="neon-input">
              <option value="">All groups</option>
              {groups.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
        {me ? (
          <Link href="/account" className="btn-outline min-h-11! shrink-0 text-sm">
            <Wallet aria-hidden className="size-4" /> {formatBdt(me.balance)}
          </Link>
        ) : (
          <Link href="/login?next=%2Frent" className="btn-outline min-h-11! shrink-0 text-sm">
            <LogIn aria-hidden className="size-4" /> Sign in
          </Link>
        )}
      </div>

      {loadError ? (
        <p role="alert" className="neon-card p-8 text-center text-muted">
          {loadError}
        </p>
      ) : services === null ? (
        <div role="status" aria-label="Loading" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton h-40" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="neon-card p-8 text-center text-muted">
          {services.length === 0 ? "No tools are available for rent yet. Please check back soon." : "No tools match your search."}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((service) => (
            <li key={service.id} className="neon-card neon-card-hover flex flex-col p-5">
              {service.group && <p className="text-xs font-semibold tracking-wide text-cyan uppercase">{service.group}</p>}
              <h2 className="mt-1 flex-1 font-display font-semibold">{service.name}</h2>
              {service.deliveryTime && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted">
                  <Clock aria-hidden className="size-3.5" /> {service.deliveryTime}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-2xl font-bold text-neon">{formatBdt(service.priceBdt)}</span>
                <button type="button" onClick={() => setOrdering(service)} className="btn-neon min-h-10! px-4! text-sm">
                  {me ? (
                    <>
                      <ShoppingCart aria-hidden className="size-4" /> Rent now
                    </>
                  ) : (
                    <>
                      <LogIn aria-hidden className="size-4" /> Sign in to rent
                    </>
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={ordering !== null} onClose={() => setOrdering(null)} title={ordering?.name ?? "Rent"}>
        {ordering && (
          <OrderForm
            key={ordering.id}
            service={ordering}
            me={me}
            ordersEnabled={ordersEnabled}
            onCancel={() => setOrdering(null)}
            onDone={() => router.push("/account")}
          />
        )}
      </Modal>
    </div>
  );
}
