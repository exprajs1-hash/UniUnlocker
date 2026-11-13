"use client";

import { Pencil, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { AdminEmpty, ListSkeleton, LoadError, PageHeader, TextField, Toggle } from "@/components/admin/form";
import { ProvidersPanel } from "@/components/admin/providers-panel";
import { formatBdt } from "@/components/rent/shared";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useResource } from "@/hooks/use-resource";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf } from "@/lib/client-api";
import type { AdminRentServiceDTO, RentConfigDTO } from "@/types";

type Data = { services: AdminRentServiceDTO[]; config: RentConfigDTO; rate: number };
type Show = "enabled" | "rent" | "all";

const PAGE = 60;
const isRent = (service: AdminRentServiceDTO) => /\brent\b/i.test(service.name) || service.type === "REMOTE";

function PricingCard({ config, rate, onSaved }: { config: RentConfigDTO; rate: number; onSaved: () => void }) {
  const [markup, setMarkup] = useState(String(config.markupPercent));
  const [ordersEnabled, setOrdersEnabled] = useState(config.ordersEnabled);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await apiFetch("/api/rent-config", { method: "PUT", body: { markupPercent: markup, ordersEnabled } });
      toast.success("Rent settings saved.");
      onSaved();
    } catch (error) {
      setErrors(fieldErrorsOf(error));
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="admin-card space-y-3 p-4">
      <p className="text-sm text-admin-muted">
        Auto price = cost in USD × {rate} (USD rate) + markup, rounded up to whole taka. The rate is set in{" "}
        <Link href="/admin/settings" className="text-primary hover:underline">
          Settings
        </Link>
        .
      </p>
      <TextField
        label="Markup %"
        type="number"
        value={markup}
        onChange={(value) => {
          setMarkup(value);
          setErrors((current) => clearFieldError(current, "markupPercent"));
        }}
        error={errors.markupPercent}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Toggle label="Accept new orders" checked={ordersEnabled} onChange={setOrdersEnabled} />
        <button type="submit" disabled={busy} className="admin-btn admin-btn-primary">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function ServiceForm({
  service,
  onSaved,
  onCancel,
}: {
  service: AdminRentServiceDTO;
  onSaved: (updated: AdminRentServiceDTO) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(service.title);
  const [price, setPrice] = useState(service.priceBdt === null ? "" : String(service.priceBdt));
  const [order, setOrder] = useState(String(service.displayOrder));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const result = await apiFetch<{ service: AdminRentServiceDTO }>(`/api/rent-services/${service.id}`, {
        method: "PATCH",
        body: { title, priceBdt: price, displayOrder: order },
      });
      toast.success("Service updated.");
      onSaved(result.service);
    } catch (error) {
      setErrors(fieldErrorsOf(error));
      toast.error(errorMessage(error));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="text-sm text-admin-muted">
        {service.providerName}: <span className="text-admin-text">{service.name}</span> · cost ${service.costUsd} · #{service.serviceId}
      </p>
      <TextField
        label="Name on website"
        hint="Leave blank to use the provider's name."
        value={title}
        onChange={setTitle}
        error={errors.title}
      />
      <TextField
        label="Fixed price (BDT)"
        type="number"
        hint="Leave blank to use the automatic price from cost, USD rate and markup."
        value={price}
        onChange={setPrice}
        error={errors.priceBdt}
      />
      <TextField label="Display order" type="number" value={order} onChange={setOrder} error={errors.displayOrder} />
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="admin-btn admin-btn-primary">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

export function RentServicesManager() {
  const { data, error, loading, reload, setData } = useResource<Data>("/api/rent-services");
  const [show, setShow] = useState<Show>("rent");
  const [query, setQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<AdminRentServiceDTO | null>(null);
  const toast = useToast();
  const services = data?.services;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (services ?? []).filter((service) => {
      if (providerFilter && service.provider !== providerFilter) return false;
      if (show === "enabled" && !service.enabled) return false;
      if (show === "rent" && !service.enabled && !isRent(service)) return false;
      if (!needle) return true;
      return `${service.name} ${service.title} ${service.group} ${service.serviceId} ${service.providerName}`.toLowerCase().includes(needle);
    });
  }, [services, show, query, providerFilter]);

  const providerOptions = useMemo(
    () => [...new Map((services ?? []).map((service) => [service.provider, service.providerName])).entries()],
    [services],
  );

  const replace = (updated: AdminRentServiceDTO) =>
    setData((current) => current && { ...current, services: current.services.map((s) => (s.id === updated.id ? updated : s)) });

  async function toggle(service: AdminRentServiceDTO, enabled: boolean) {
    replace({ ...service, enabled });
    try {
      const result = await apiFetch<{ service: AdminRentServiceDTO }>(`/api/rent-services/${service.id}`, {
        method: "PATCH",
        body: { enabled },
      });
      replace(result.service);
    } catch (toggleError) {
      replace(service);
      toast.error(errorMessage(toggleError));
    }
  }

  const enabledCount = services?.filter((service) => service.enabled).length ?? 0;

  return (
    <>
      <PageHeader
        title="Rent services"
        description="Add your providers, sync their services, then pick which ones customers can rent and at what price."
      />

      {loading ? (
        <ListSkeleton />
      ) : error && !data ? (
        <LoadError message={error} onRetry={reload} />
      ) : data ? (
        <>
          <div className="mb-6 space-y-4">
            <ProvidersPanel onServicesChanged={reload} />
            <PricingCard key={JSON.stringify(data.config)} config={data.config} rate={data.rate} onSaved={reload} />
          </div>

          {data.services.length === 0 ? (
            <AdminEmpty
              title="No services yet"
              message="Add a provider above and press its Sync button to load its services. New services start hidden."
            />
          ) : (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="relative flex-1">
                  <span className="sr-only">Search services</span>
                  <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-admin-muted" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setLimit(PAGE);
                    }}
                    placeholder="Search by name, group or ID"
                    className="admin-input pl-9!"
                  />
                </label>
                {providerOptions.length > 1 && (
                  <label className="sm:w-52">
                    <span className="sr-only">Provider</span>
                    <select
                      value={providerFilter}
                      onChange={(event) => {
                        setProviderFilter(event.target.value);
                        setLimit(PAGE);
                      }}
                      className="admin-input"
                    >
                      <option value="">All providers</option>
                      {providerOptions.map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="sm:w-60">
                  <span className="sr-only">Show</span>
                  <select
                    value={show}
                    onChange={(event) => {
                      setShow(event.target.value as Show);
                      setLimit(PAGE);
                    }}
                    className="admin-input"
                  >
                    <option value="rent">Rent / remote services</option>
                    <option value="enabled">Shown on website ({enabledCount})</option>
                    <option value="all">All services ({data.services.length})</option>
                  </select>
                </label>
              </div>

              {visible.length === 0 ? (
                <AdminEmpty title="Nothing matches" message="Try another search or filter." />
              ) : (
                <ul className="space-y-2">
                  {visible.slice(0, limit).map((service) => (
                    <li
                      key={service.id}
                      className={`admin-card flex flex-col gap-3 p-3 sm:flex-row sm:items-center ${
                        service.enabled ? "" : "opacity-75"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {service.title || service.name}
                          {!service.availableOnProvider && (
                            <span className="ml-2 rounded bg-status-offline/15 px-1.5 py-0.5 text-xs text-status-offline">
                              Removed by provider
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-admin-muted">
                          {service.providerName} · #{service.serviceId} · {service.group} · {service.type}
                          {service.customFields.length > 0 && ` · asks for ${service.customFields.map((f) => f.name).join(", ")}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="font-semibold">{formatBdt(service.effectivePriceBdt)}</p>
                          <p className="text-xs text-admin-muted">
                            cost ${service.costUsd} · {service.priceBdt === null ? "auto" : "fixed"}
                          </p>
                        </div>
                        <Toggle
                          label={`Show ${service.name} on the website`}
                          hideLabel
                          checked={service.enabled}
                          disabled={!service.availableOnProvider && !service.enabled}
                          onChange={(value) => void toggle(service, value)}
                        />
                        <button type="button" aria-label={`Edit ${service.name}`} onClick={() => setEditing(service)} className="admin-icon-btn">
                          <Pencil aria-hidden className="size-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {visible.length > limit && (
                <div className="mt-4 text-center">
                  <button type="button" onClick={() => setLimit((value) => value + PAGE)} className="admin-btn admin-btn-secondary">
                    Show more ({visible.length - limit} left)
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : null}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit rent service">
        {editing && (
          <ServiceForm
            key={editing.id}
            service={editing}
            onCancel={() => setEditing(null)}
            onSaved={(updated) => {
              replace(updated);
              setEditing(null);
            }}
          />
        )}
      </Modal>
    </>
  );
}
