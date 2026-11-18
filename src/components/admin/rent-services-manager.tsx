"use client";

import { ArrowDownUp, Flame, Hand, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { AdminEmpty, ListSkeleton, LoadError, PageHeader, SelectField, TextAreaField, TextField, Toggle } from "@/components/admin/form";
import { ImageField } from "@/components/admin/image-field";
import { ProvidersPanel } from "@/components/admin/providers-panel";
import { formatBdt, ToolIcon } from "@/components/rent/shared";
import { ArrangeServices } from "@/components/admin/arrange-services";
import { CustomServiceForm } from "@/components/admin/custom-service-form";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useResource } from "@/hooks/use-resource";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf } from "@/lib/client-api";
import { formatCost } from "@/lib/pricing";
import { detectCategory } from "@/lib/rent-category";
import { ServiceCategoriesPanel } from "@/components/admin/service-categories-panel";
import type { AdminRentServiceDTO, RentConfigDTO, ServiceCategoryDTO } from "@/types";

type Data = { services: AdminRentServiceDTO[]; config: RentConfigDTO; rate: number };
/** A fixed filter, or "cat:<slug>" for one category. */
type Show = "enabled" | "rent" | "featured" | "hot" | "custom" | "all" | "problems" | `cat:${string}`;
type Flags = Partial<Pick<AdminRentServiceDTO, "enabled" | "featured" | "hot">>;

/** A small on/off pill for the homepage Featured / Hot picks. */
function PickButton({
  active,
  label,
  icon: Icon,
  activeClass,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: typeof Star;
  activeClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={active ? `Remove from ${label}` : `Add to ${label}`}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold transition ${
        active ? activeClass : "border-admin-line text-admin-muted hover:text-admin-text"
      }`}
    >
      <Icon aria-hidden className={`size-3.5 ${active ? "fill-current" : ""}`} />
      {label}
    </button>
  );
}

const failedLastOrder = (service: AdminRentServiceDTO) =>
  service.lastOrder !== null && ["rejected", "failed"].includes(service.lastOrder.status);

function LastOrderBadge({ service }: { service: AdminRentServiceDTO }) {
  const last = service.lastOrder;
  if (!last) return <span className="text-admin-muted">Not ordered yet</span>;
  if (failedLastOrder(service)) {
    return (
      <span className="rounded bg-status-offline/15 px-1.5 py-0.5 text-status-offline">
        ✕ Last order failed{last.note ? `: ${last.note}` : ""}
      </span>
    );
  }
  if (last.status === "completed") {
    return <span className="rounded bg-status-online/15 px-1.5 py-0.5 text-status-online">✓ Last order completed</span>;
  }
  return <span className="rounded bg-status-maintenance/15 px-1.5 py-0.5 text-status-maintenance">… Last order in progress</span>;
}

const PAGE = 60;
const isRent = (service: AdminRentServiceDTO) => /\brent\b/i.test(service.name) || service.type === "REMOTE";

function PricingCard({ config, rate, onSaved }: { config: RentConfigDTO; rate: number; onSaved: () => void }) {
  const [markup, setMarkup] = useState(String(config.markupPercent));
  const [ordersEnabled, setOrdersEnabled] = useState(config.ordersEnabled);
  const [pricesPublic, setPricesPublic] = useState(config.pricesPublic);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await apiFetch("/api/rent-config", { method: "PUT", body: { markupPercent: markup, ordersEnabled, pricesPublic } });
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
        Auto price = cost + markup, rounded up to the paisa (e.g. ৳0.51). USD providers&apos; costs are first multiplied by {rate} (USD rate);
        BDT providers&apos; costs are used as-is. The rate is set in{" "}
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
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Toggle label="Accept new orders" checked={ordersEnabled} onChange={setOrdersEnabled} />
          <Toggle label="Show prices to everyone (off: logged-in customers only)" checked={pricesPublic} onChange={setPricesPublic} />
        </div>
        <button type="submit" disabled={busy} className="admin-btn admin-btn-primary">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function ServiceForm({
  service,
  categories,
  onSaved,
  onCancel,
}: {
  service: AdminRentServiceDTO;
  categories: ServiceCategoryDTO[];
  onSaved: (updated: AdminRentServiceDTO) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(service.title);
  const [description, setDescription] = useState(service.description);
  const [icon, setIcon] = useState(service.icon ?? "");
  const [category, setCategory] = useState(service.category ?? "");
  const detected = detectCategory(service.type, service.name);
  const nameOf = (slug: string) => categories.find((item) => item.slug === slug)?.name ?? slug;
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
        body: { title, description, icon, category, priceBdt: price, displayOrder: order },
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
        {service.providerName}: <span className="text-admin-text">{service.name}</span> · cost {formatCost(service.costUsd, service.costCurrency)} · #{service.serviceId}
      </p>
      <TextField
        label="Name on website"
        hint="Leave blank to use the provider's name."
        value={title}
        onChange={setTitle}
        error={errors.title}
      />
      <div>
        <SelectField<string>
          label="Category on website"
          value={category}
          onChange={setCategory}
          error={errors.category}
          options={[
            { value: "", label: `Auto (${nameOf(detected)})` },
            ...categories.map(({ slug, name, builtIn, enabled }) => ({
              value: slug,
              label: `${name}${builtIn ? "" : enabled ? " (custom)" : " (custom, hidden)"}`,
            })),
          ]}
        />
        <p className="mt-1 text-xs text-admin-muted">
          Which Services page customers find it on. Make your own categories in the Categories box above. Provider type:{" "}
          {service.type || "unknown"}.
        </p>
      </div>
      <ImageField
        label="Tool icon"
        value={icon}
        onChange={setIcon}
        error={errors.icon}
        hint="Square logo works best (PNG/WebP). Shown in the rent list and on the details page."
      />
      <TextAreaField
        label="Description on website"
        hint="Shown to customers in the rent dialog. Leave blank to show none. The provider's text is never shown."
        value={description}
        onChange={setDescription}
        error={errors.description}
        rows={5}
      />
      <TextField
        label="Fixed price (BDT)"
        type="number"
        hint="Paisa allowed, e.g. 0.50. Leave blank to use the automatic price from cost, USD rate and markup."
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
  const { data: categoryData, reload: reloadCategories } = useResource<{ categories: ServiceCategoryDTO[] }>("/api/rent-categories");
  const categories = categoryData?.categories ?? [];
  const categoryName = (slug: string) => categories.find((item) => item.slug === slug)?.name ?? slug;
  const [show, setShow] = useState<Show>("rent");
  const [query, setQuery] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState<AdminRentServiceDTO | null>(null);
  /** A custom service being created ("new") or edited. */
  const [customForm, setCustomForm] = useState<AdminRentServiceDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<AdminRentServiceDTO | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [arranging, setArranging] = useState(false);
  const toast = useToast();
  const services = data?.services;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (services ?? []).filter((service) => {
      if (providerFilter && service.provider !== providerFilter) return false;
      if (show === "enabled" && !service.enabled) return false;
      if (show === "rent" && !service.enabled && !isRent(service)) return false;
      if (show.startsWith("cat:") && service.effectiveCategory !== show.slice(4)) return false;
      if (show === "featured" && !service.featured) return false;
      if (show === "hot" && !service.hot) return false;
      if (show === "custom" && !service.manual) return false;
      if (show === "problems" && !failedLastOrder(service) && service.availableOnProvider) return false;
      if (!needle) return true;
      return `${service.name} ${service.title} ${service.group} ${service.serviceId} ${service.providerName}`.toLowerCase().includes(needle);
    });
  }, [services, show, query, providerFilter]);

  const providerOptions = useMemo(
    () => [...new Map((services ?? []).map((service) => [service.provider, service.providerName])).entries()],
    [services],
  );

  const replace = (updated: AdminRentServiceDTO) =>
    setData(
      (current) =>
        current && {
          ...current,
          // Edits return the service without its order history, so keep the last-order info we have.
          services: current.services.map((s) => (s.id === updated.id ? { ...updated, lastOrder: s.lastOrder } : s)),
        },
    );

  async function toggle(service: AdminRentServiceDTO, flags: Flags) {
    replace({ ...service, ...flags });
    try {
      const result = await apiFetch<{ service: AdminRentServiceDTO }>(`/api/rent-services/${service.id}`, {
        method: "PATCH",
        body: flags,
      });
      replace(result.service);
    } catch (toggleError) {
      replace(service);
      toast.error(errorMessage(toggleError));
    }
  }

  const enabledCount = services?.filter((service) => service.enabled).length ?? 0;
  const featuredCount = services?.filter((service) => service.featured).length ?? 0;
  const hotCount = services?.filter((service) => service.hot).length ?? 0;
  const customCount = services?.filter((service) => service.manual).length ?? 0;

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await apiFetch(`/api/rent-services/${deleting.id}`, { method: "DELETE" });
      setData((current) => current && { ...current, services: current.services.filter((s) => s.id !== deleting.id) });
      toast.success(`"${deleting.title || deleting.name}" deleted. Past orders are kept.`);
      setDeleting(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeleteBusy(false);
    }
  }
  const categoryCounts: Record<string, number> = {};
  for (const service of services ?? []) categoryCounts[service.effectiveCategory] = (categoryCounts[service.effectiveCategory] ?? 0) + 1;
  const problemCount = services?.filter((service) => failedLastOrder(service) || !service.availableOnProvider).length ?? 0;

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
            <ServiceCategoriesPanel
              categories={categories}
              onChanged={() => {
                reloadCategories();
                // Deleting a category moves its services back to Auto.
                reload();
              }}
            />
            <PricingCard key={JSON.stringify(data.config)} config={data.config} rate={data.rate} onSaved={reload} />
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold">Services</h2>
              <p className="text-xs text-admin-muted">Provider services sync automatically. Custom services are ones you deliver yourself.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setArranging(true)} className="admin-btn admin-btn-secondary">
                <ArrowDownUp aria-hidden className="size-4" /> Arrange order
              </button>
              <button type="button" onClick={() => setCustomForm("new")} className="admin-btn admin-btn-primary">
                <Plus aria-hidden className="size-4" /> Add custom service
              </button>
            </div>
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
                    {categories
                      .filter((item) => item.slug !== "rent")
                      .map((item) => (
                        <option key={item.slug} value={`cat:${item.slug}`}>
                          {item.name} ({categoryCounts[item.slug] ?? 0})
                        </option>
                      ))}
                    <option value="enabled">Shown on website ({enabledCount})</option>
                    <option value="featured">Featured products ({featuredCount})</option>
                    <option value="hot">Hot products ({hotCount})</option>
                    <option value="custom">Custom services ({customCount})</option>
                    <option value="all">All services ({data.services.length})</option>
                    <option value="problems">Problem services ({problemCount})</option>
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
                      <ToolIcon src={service.icon} name={service.title || service.name} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {service.title || service.name}
                          <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-xs text-primary">
                            {categoryName(service.effectiveCategory)}
                          </span>
                          {service.manual && (
                            <span className="ml-2 inline-flex items-center gap-1 rounded bg-purple/15 px-1.5 py-0.5 text-xs text-purple">
                              <Hand aria-hidden className="size-3" /> Custom
                            </span>
                          )}
                          {service.availableOnProvider ? (
                            <span className="ml-2 rounded bg-status-online/15 px-1.5 py-0.5 text-xs text-status-online">Available</span>
                          ) : (
                            <span className="ml-2 rounded bg-status-offline/15 px-1.5 py-0.5 text-xs text-status-offline">
                              Removed by provider
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-admin-muted">
                          {service.providerName} · #{service.serviceId} · {service.group} · {service.type}
                          {service.deliveryTime && ` · ${service.deliveryTime}`}
                        </p>
                        <p className="text-xs text-admin-muted">
                          {service.customFields.length > 0
                            ? `Customer enters: ${service.customFields.map((f) => `${f.name}${f.required ? "*" : ""}`).join(", ")}`
                            : "No customer input needed"}
                        </p>
                        <p className="mt-1 text-xs">
                          <LastOrderBadge service={service} />
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <PickButton
                            label="Featured"
                            icon={Star}
                            active={service.featured}
                            activeClass="border-amber-400/60 bg-amber-400/15 text-amber-500"
                            onClick={() => void toggle(service, { featured: !service.featured })}
                          />
                          <PickButton
                            label="Hot"
                            icon={Flame}
                            active={service.hot}
                            activeClass="border-rose-500/60 bg-rose-500/15 text-rose-500"
                            onClick={() => void toggle(service, { hot: !service.hot })}
                          />
                          {(service.featured || service.hot) && !service.enabled && (
                            <span className="text-xs text-status-maintenance">Turn the service on to show it on the homepage</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="font-semibold">{formatBdt(service.effectivePriceBdt)}</p>
                          <p className="text-xs text-admin-muted">
                            cost {formatCost(service.costUsd, service.costCurrency)} ·{service.priceBdt === null ? "auto" : "fixed"}
                          </p>
                        </div>
                        <Toggle
                          label={`Show ${service.name} on the website`}
                          hideLabel
                          checked={service.enabled}
                          disabled={!service.availableOnProvider && !service.enabled}
                          onChange={(value) => void toggle(service, { enabled: value })}
                        />
                        <button
                          type="button"
                          aria-label={`Edit ${service.name}`}
                          onClick={() => (service.manual ? setCustomForm(service) : setEditing(service))}
                          className="admin-icon-btn"
                        >
                          <Pencil aria-hidden className="size-4" />
                        </button>
                        {service.manual && (
                          <button
                            type="button"
                            aria-label={`Delete ${service.name}`}
                            onClick={() => setDeleting(service)}
                            className="admin-icon-btn hover:text-status-offline!"
                          >
                            <Trash2 aria-hidden className="size-4" />
                          </button>
                        )}
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

      <Modal
        open={customForm !== null}
        onClose={() => setCustomForm(null)}
        title={customForm === "new" ? "Add custom service" : "Edit custom service"}
        className="max-w-2xl"
      >
        {customForm !== null && (
          <CustomServiceForm
            key={customForm === "new" ? "new" : customForm.id}
            service={customForm === "new" ? null : customForm}
            categories={categories}
            onCancel={() => setCustomForm(null)}
            onSaved={(saved) => {
              if (customForm === "new") {
                setData((current) => current && { ...current, services: [saved, ...current.services] });
                setShow("custom");
              } else {
                replace(saved);
              }
              setCustomForm(null);
            }}
          />
        )}
      </Modal>

      <Modal open={arranging} onClose={() => setArranging(false)} title="Arrange services" className="max-w-2xl">
        {arranging && data && (
          <ArrangeServices
            services={data.services}
            categories={categories}
            onSaved={(ordered) => {
              const order = new Map(ordered.map((service) => [service.id, service.displayOrder]));
              setData(
                (current) =>
                  current && {
                    ...current,
                    services: current.services.map((s) => (order.has(s.id) ? { ...s, displayOrder: order.get(s.id)! } : s)),
                  },
              );
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete custom service?"
        message={`"${deleting?.title || deleting?.name}" will be removed from the website. Past orders and their results are kept.`}
        busy={deleteBusy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit rent service">
        {editing && (
          <ServiceForm
            key={editing.id}
            service={editing}
            categories={categories}
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
