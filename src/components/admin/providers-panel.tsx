"use client";

import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { TextField, Toggle } from "@/components/admin/form";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf } from "@/lib/client-api";
import type { ProviderDTO } from "@/types";

function ProviderForm({
  provider,
  onSaved,
  onCancel,
}: {
  provider: ProviderDTO | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState({
    name: provider?.name ?? "",
    url: provider?.url ?? "",
    username: provider?.username ?? "",
    key: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = (field: keyof typeof draft) => (value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => clearFieldError(current, field));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await apiFetch(provider ? `/api/rent-providers/${provider.id}` : "/api/rent-providers", {
        method: provider ? "PUT" : "POST",
        body: draft,
      });
      toast.success(provider ? "Provider updated." : "Provider added. Press Sync to load its services.");
      onSaved();
    } catch (error) {
      setErrors(fieldErrorsOf(error));
      toast.error(errorMessage(error));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <TextField label="Name" placeholder="e.g. GSM Munna Server" value={draft.name} onChange={set("name")} error={errors.name} required />
      <TextField
        label="API URL"
        type="url"
        placeholder="https://example.com/public/api/index.php"
        value={draft.url}
        onChange={set("url")}
        error={errors.url}
        required
      />
      <TextField label="Username" value={draft.username} onChange={set("username")} error={errors.username} autoComplete="off" required />
      <TextField
        label="API key"
        type="password"
        autoComplete="new-password"
        placeholder={provider?.keyHint ? `Saved (${provider.keyHint})` : "Paste the API key"}
        hint={provider ? "Leave blank to keep the current key." : undefined}
        value={draft.key}
        onChange={set("key")}
        error={errors.key}
        required={!provider}
      />
      <p className="text-xs text-admin-muted">The details are tested with the provider before they are saved.</p>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="admin-btn admin-btn-primary">
          {busy ? "Testing…" : "Test & save"}
        </button>
      </div>
    </form>
  );
}

function ProviderBalance({ id, version }: { id: string; version: number }) {
  const [state, setState] = useState<{ text: string; ok: boolean }>({ text: "Checking…", ok: true });
  useEffect(() => {
    let active = true;
    apiFetch<{ account: { credit: number; currency: string } | null; error: string | null }>(`/api/rent-providers/${id}/balance`)
      .then(({ account, error }) => {
        if (!active) return;
        setState(account ? { text: `${account.credit.toFixed(2)} ${account.currency}`, ok: true } : { text: error ?? "Unavailable", ok: false });
      })
      .catch((error: unknown) => active && setState({ text: errorMessage(error), ok: false }));
    return () => {
      active = false;
    };
  }, [id, version]);
  return <span className={state.ok ? "font-semibold" : "text-status-offline"}>{state.text}</span>;
}

/** The provider accounts rent services come from, with balance, sync and edit. */
export function ProvidersPanel({ onServicesChanged }: { onServicesChanged: () => void }) {
  const [providers, setProviders] = useState<ProviderDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<ProviderDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<ProviderDTO | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    apiFetch<{ providers: ProviderDTO[] }>("/api/rent-providers")
      .then((data) => {
        if (!active) return;
        setProviders(data.providers);
        setLoadError(null);
      })
      .catch((error: unknown) => active && setLoadError(errorMessage(error)));
    return () => {
      active = false;
    };
  }, [version]);

  const reload = () => setVersion((value) => value + 1);

  async function sync(provider: ProviderDTO) {
    setBusyId(provider.id);
    try {
      const result = await apiFetch<{ total: number; added: number; unavailable: number }>(
        `/api/rent-providers/${provider.id}/sync`,
        { method: "POST" },
      );
      toast.success(`${provider.name}: ${result.total} services (${result.added} new, ${result.unavailable} no longer offered).`);
      reload();
      onServicesChanged();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  async function toggle(provider: ProviderDTO, enabled: boolean) {
    setProviders((current) => current && current.map((p) => (p.id === provider.id ? { ...p, enabled } : p)));
    try {
      await apiFetch(`/api/rent-providers/${provider.id}`, { method: "PATCH", body: { enabled } });
      toast.success(enabled ? `${provider.name} turned on.` : `${provider.name} turned off – its services are hidden.`);
    } catch (error) {
      setProviders((current) => current && current.map((p) => (p.id === provider.id ? provider : p)));
      toast.error(errorMessage(error));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await apiFetch(`/api/rent-providers/${deleting.id}`, { method: "DELETE" });
      toast.success(`${deleting.name} deleted.`);
      setDeleting(null);
      reload();
      onServicesChanged();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="admin-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">Providers</h2>
          <p className="text-xs text-admin-muted">API accounts that rent services are bought from.</p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className="admin-btn admin-btn-primary">
          <Plus aria-hidden className="size-4" /> Add provider
        </button>
      </div>

      {loadError ? (
        <p className="text-sm text-status-offline">{loadError}</p>
      ) : providers === null ? (
        <p className="text-sm text-admin-muted">Loading…</p>
      ) : providers.length === 0 ? (
        <p className="text-sm text-admin-muted">No providers yet. Add one with its API URL, username and key.</p>
      ) : (
        <ul className="divide-y divide-admin-line">
          {providers.map((provider) => (
            <li key={provider.id} className={`flex flex-col gap-3 py-3 lg:flex-row lg:items-center ${provider.enabled ? "" : "opacity-60"}`}>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{provider.name}</p>
                <p className="truncate text-xs text-admin-muted">
                  {provider.url} · {provider.username} · key {provider.keyHint || "not set"}
                </p>
                <p className="text-xs text-admin-muted">
                  {provider.serviceCount} services, {provider.enabledServiceCount} shown · Balance{" "}
                  <ProviderBalance id={provider.id} version={version} />
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Toggle
                  label={`Use ${provider.name}`}
                  hideLabel
                  checked={provider.enabled}
                  onChange={(value) => void toggle(provider, value)}
                />
                <button
                  type="button"
                  onClick={() => void sync(provider)}
                  disabled={busyId === provider.id}
                  className="admin-btn admin-btn-secondary"
                >
                  <RefreshCw aria-hidden className={`size-4 ${busyId === provider.id ? "animate-spin" : ""}`} />
                  {busyId === provider.id ? "Syncing…" : "Sync"}
                </button>
                <button type="button" aria-label={`Edit ${provider.name}`} onClick={() => setEditing(provider)} className="admin-icon-btn">
                  <Pencil aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${provider.name}`}
                  onClick={() => setDeleting(provider)}
                  className="admin-icon-btn hover:text-status-offline!"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add provider" : "Edit provider"}>
        {editing !== null && (
          <ProviderForm
            key={editing === "new" ? "new" : editing.id}
            provider={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              reload();
              onServicesChanged();
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete provider?"
        message={`"${deleting?.name}" and its ${deleting?.serviceCount ?? 0} synced services will be removed from the website. Past orders are kept. To pause it instead, turn it off.`}
        busy={busyId !== null}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}
