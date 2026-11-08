"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AdminEmpty, ListSkeleton, LoadError, PageHeader, SelectField, TextAreaField, TextField, Toggle } from "@/components/admin/form";
import { ImageField } from "@/components/admin/image-field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { RelativeTime } from "@/components/ui/relative-time";
import { SafeImage } from "@/components/ui/safe-image";
import { useToast } from "@/components/ui/toast";
import { useResource } from "@/hooks/use-resource";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf, moved } from "@/lib/client-api";
import { computeOverallStatus, OVERALL_META, STATUS_META } from "@/lib/server-status";
import { DEFAULT_USD_TO_BDT, withConvertedPrices } from "@/lib/pricing";
import { SERVER_STATUSES, type ServerDTO, type ServerStatus, type WebsiteSettingsDTO } from "@/types";
import { formatPrice, type Currency } from "@/utils/format";

type Draft = Pick<ServerDTO, "name" | "description" | "logo" | "status" | "enabled" | "displayOrder"> & {
  // One price in one currency; the website calculates the other from the rate in Settings.
  price: string;
  priceCurrency: Currency;
};

const CURRENCY_OPTIONS = [
  { value: "BDT" as const, label: "৳ BDT" },
  { value: "USD" as const, label: "$ USD" },
];

/** Opens an existing server on the currency its price was entered in (BDT if it somehow has both). */
function priceDraft(server: Pick<ServerDTO, "priceBdt" | "priceUsd">): Pick<Draft, "price" | "priceCurrency"> {
  if (server.priceBdt != null) return { price: String(server.priceBdt), priceCurrency: "BDT" };
  if (server.priceUsd != null) return { price: String(server.priceUsd), priceCurrency: "USD" };
  return { price: "", priceCurrency: "BDT" };
}

/** Live "≈ $2.08" preview under the price, so the admin sees what visitors will see. */
function PricePreview({ price, currency }: { price: string; currency: Currency }) {
  const { data } = useResource<{ settings: WebsiteSettingsDTO }>("/api/settings");
  const rate = data?.settings.usdToBdtRate ?? DEFAULT_USD_TO_BDT;
  const amount = Number(price);
  if (price.trim() === "" || !Number.isFinite(amount) || amount < 0) return null;
  const other: Currency = currency === "BDT" ? "USD" : "BDT";
  const converted = withConvertedPrices(
    { priceBdt: currency === "BDT" ? amount : null, priceUsd: currency === "USD" ? amount : null } as ServerDTO,
    rate,
  );
  const otherAmount = other === "USD" ? converted.priceUsd : converted.priceBdt;
  if (otherAmount == null) return null;
  return (
    <p className="-mt-2 text-xs text-admin-muted">
      Visitors see <span className="font-semibold text-admin-text">{formatPrice(amount, currency)}</span> or{" "}
      <span className="font-semibold text-admin-text">≈ {formatPrice(otherAmount, other)}</span> (1 USD = {rate} BDT, change it in Settings).
    </p>
  );
}

const STATUS_OPTIONS = SERVER_STATUSES.map((value) => ({ value, label: STATUS_META[value].label }));

function ServerForm({
  initial,
  serverId,
  onSaved,
  onCancel,
}: {
  initial: Draft;
  serverId: string | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => clearFieldError(current, key));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    const { price, priceCurrency, ...rest } = draft;
    try {
      await apiFetch(serverId ? `/api/servers/${serverId}` : "/api/servers", {
        method: serverId ? "PUT" : "POST",
        // Only the chosen currency is stored, so the other is always calculated from the current rate.
        body: { ...rest, priceBdt: priceCurrency === "BDT" ? price : "", priceUsd: priceCurrency === "USD" ? price : "" },
      });
      toast.success(serverId ? "Server updated." : "Server added.");
      onSaved();
    } catch (error) {
      setErrors(fieldErrorsOf(error));
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <TextField label="Name" value={draft.name} onChange={(value) => set("name", value)} error={errors.name} required />
      <TextAreaField label="Description" rows={2} value={draft.description} onChange={(value) => set("description", value)} error={errors.description} />
      <ImageField label="Brand logo" value={draft.logo} onChange={(value) => set("logo", value)} error={errors.logo} />
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <TextField
          label="Price"
          type="number"
          placeholder={draft.priceCurrency === "BDT" ? "e.g. 260" : "e.g. 2"}
          hint="Enter it once; the other currency is calculated. Blank shows no price."
          value={draft.price}
          onChange={(value) => set("price", value)}
          error={errors.priceBdt ?? errors.priceUsd}
        />
        <SelectField label="Currency" value={draft.priceCurrency} options={CURRENCY_OPTIONS} onChange={(value) => set("priceCurrency", value)} />
      </div>
      <PricePreview price={draft.price} currency={draft.priceCurrency} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Status" value={draft.status} options={STATUS_OPTIONS} onChange={(value) => set("status", value)} error={errors.status} />
        <TextField
          label="Display order"
          type="number"
          value={String(draft.displayOrder)}
          onChange={(value) => set("displayOrder", Number(value))}
          error={errors.displayOrder}
        />
      </div>
      <Toggle label="Show on the public website" checked={draft.enabled} onChange={(value) => set("enabled", value)} />
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="admin-btn admin-btn-primary">
          {busy ? "Saving…" : "Save server"}
        </button>
      </div>
    </form>
  );
}

export function ServersManager() {
  const { data, error, loading, reload, setData } = useResource<{ servers: ServerDTO[] }>("/api/servers?all=1");
  const [editing, setEditing] = useState<ServerDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<ServerDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const servers = data?.servers ?? [];

  const patchLocal = (id: string, changes: Partial<ServerDTO>) =>
    setData((current) =>
      current && { servers: current.servers.map((s) => (s.id === id ? { ...s, ...changes } : s)) },
    );

  async function patch(server: ServerDTO, changes: { status?: ServerStatus; enabled?: boolean }, message: string) {
    // Applied right away so the control responds instantly; the reply has the saved timestamp.
    patchLocal(server.id, changes);
    try {
      const result = await apiFetch<{ server: ServerDTO }>(`/api/servers/${server.id}`, { method: "PATCH", body: changes });
      patchLocal(server.id, result.server);
      toast.success(message);
    } catch (patchError) {
      patchLocal(server.id, server);
      toast.error(errorMessage(patchError));
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = moved(servers, index, direction);
    if (!next) return;
    setData(() => ({ servers: next }));
    try {
      await apiFetch("/api/servers/reorder", { method: "POST", body: { ids: next.map((s) => s.id) } });
    } catch (moveError) {
      toast.error(errorMessage(moveError));
      reload();
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiFetch(`/api/servers/${deleting.id}`, { method: "DELETE" });
      toast.success("Server deleted.");
      setDeleting(null);
      reload();
    } catch (deleteError) {
      toast.error(errorMessage(deleteError));
    } finally {
      setBusy(false);
    }
  }

  const visible = servers.filter((server) => server.enabled);
  const overall = OVERALL_META[computeOverallStatus(visible)];

  return (
    <>
      <PageHeader
        title="Servers"
        description={`Status changes go live immediately. Public website now shows: ${overall.label}.`}
        action={
          <button type="button" onClick={() => setEditing("new")} className="admin-btn admin-btn-primary">
            <Plus aria-hidden className="size-4" /> Add server
          </button>
        }
      />

      {loading ? (
        <ListSkeleton />
      ) : error && !data ? (
        <LoadError message={error} onRetry={reload} />
      ) : servers.length === 0 ? (
        <AdminEmpty title="No servers yet" message="Add your first server to show its status on the website." />
      ) : (
        <ul className="space-y-3">
          {servers.map((server, index) => (
            <li key={server.id} className={`admin-card flex flex-col gap-4 p-4 lg:flex-row lg:items-center ${server.enabled ? "" : "opacity-65"}`}>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <SafeImage src={server.logo} alt="" width={44} height={44} className="size-11 shrink-0 rounded-lg object-contain" />
                <div className="min-w-0">
                  <h2 className="truncate font-medium">{server.name}</h2>
                  <p className="text-xs text-admin-muted">
                    {server.priceBdt != null && <span className="font-medium text-admin-text">{formatPrice(server.priceBdt, "BDT")} · </span>}
                    {server.priceUsd != null && <span className="font-medium text-admin-text">{formatPrice(server.priceUsd, "USD")} · </span>}
                    Updated <RelativeTime iso={server.statusUpdatedAt} />
                  </p>
                </div>
              </div>

              <div role="group" aria-label={`Status of ${server.name}`} className="flex flex-wrap gap-1 rounded-lg bg-admin-bg p-1">
                {SERVER_STATUSES.map((status) => {
                  const meta = STATUS_META[status];
                  const active = server.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        if (!active) void patch(server, { status }, `${server.name} is now ${meta.label.toLowerCase()}.`);
                      }}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        active ? "bg-admin-raised text-admin-text" : "text-admin-muted hover:text-admin-text"
                      }`}
                    >
                      <span aria-hidden className={`size-2 rounded-full ${meta.dot}`} /> {meta.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <Toggle
                  label={`Show ${server.name} on the website`}
                  hideLabel
                  checked={server.enabled}
                  onChange={(enabled) => void patch(server, { enabled }, enabled ? `${server.name} enabled.` : `${server.name} hidden.`)}
                />
                <button type="button" aria-label={`Move ${server.name} up`} disabled={index === 0} onClick={() => void move(index, -1)} className="admin-icon-btn">
                  <ArrowUp aria-hidden className="size-4" />
                </button>
                <button type="button" aria-label={`Move ${server.name} down`} disabled={index === servers.length - 1} onClick={() => void move(index, 1)} className="admin-icon-btn">
                  <ArrowDown aria-hidden className="size-4" />
                </button>
                <button type="button" aria-label={`Edit ${server.name}`} onClick={() => setEditing(server)} className="admin-icon-btn">
                  <Pencil aria-hidden className="size-4" />
                </button>
                <button type="button" aria-label={`Delete ${server.name}`} onClick={() => setDeleting(server)} className="admin-icon-btn hover:text-status-offline!">
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add server" : "Edit server"}>
        {editing !== null && (
          <ServerForm
            key={editing === "new" ? "new" : editing.id}
            serverId={editing === "new" ? null : editing.id}
            initial={
              editing === "new"
                ? { name: "", description: "", logo: "", price: "", priceCurrency: "BDT", status: "online", enabled: true, displayOrder: servers.length }
                : { ...editing, ...priceDraft(editing) }
            }
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              reload();
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete server?"
        message={`"${deleting?.name}" will be removed from the website. This cannot be undone.`}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
