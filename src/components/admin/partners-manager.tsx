"use client";

import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AdminEmpty, ListSkeleton, LoadError, PageHeader, TextField, Toggle } from "@/components/admin/form";
import { ImageField } from "@/components/admin/image-field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { SafeImage } from "@/components/ui/safe-image";
import { useToast } from "@/components/ui/toast";
import { useResource } from "@/hooks/use-resource";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf, moved } from "@/lib/client-api";
import type { PartnerDTO } from "@/types";

type Draft = Pick<PartnerDTO, "name" | "logo" | "url" | "displayOrder" | "enabled">;

function PartnerForm({
  initial,
  partnerId,
  onSaved,
  onCancel,
}: {
  initial: Draft;
  partnerId: string | null;
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
    try {
      await apiFetch(partnerId ? `/api/partners/${partnerId}` : "/api/partners", {
        method: partnerId ? "PUT" : "POST",
        body: draft,
      });
      toast.success(partnerId ? "Partner updated." : "Partner added.");
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
      <ImageField label="Logo" value={draft.logo} onChange={(value) => set("logo", value)} error={errors.logo} />
      <TextField
        label="Website link"
        type="url"
        placeholder="https://partner-site.com"
        hint="Optional. Visitors who click the logo open this site in a new tab."
        value={draft.url}
        onChange={(value) => set("url", value)}
        error={errors.url}
      />
      <TextField
        label="Display order"
        type="number"
        value={String(draft.displayOrder)}
        onChange={(value) => set("displayOrder", Number(value))}
        error={errors.displayOrder}
      />
      <Toggle label="Show on the public website" checked={draft.enabled} onChange={(value) => set("enabled", value)} />
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="admin-btn admin-btn-primary">
          {busy ? "Saving…" : "Save partner"}
        </button>
      </div>
    </form>
  );
}

export function PartnersManager() {
  const { data, error, loading, reload, setData } = useResource<{ partners: PartnerDTO[] }>("/api/partners?all=1");
  const [editing, setEditing] = useState<PartnerDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<PartnerDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const partners = data?.partners ?? [];

  async function toggle(partner: PartnerDTO, enabled: boolean) {
    const apply = (value: boolean) =>
      setData((current) =>
        current && { partners: current.partners.map((p) => (p.id === partner.id ? { ...p, enabled: value } : p)) },
      );
    apply(enabled);
    try {
      await apiFetch(`/api/partners/${partner.id}`, { method: "PATCH", body: { enabled } });
      toast.success(enabled ? `${partner.name} enabled.` : `${partner.name} hidden.`);
    } catch (toggleError) {
      apply(!enabled);
      toast.error(errorMessage(toggleError));
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = moved(partners, index, direction);
    if (!next) return;
    setData(() => ({ partners: next }));
    try {
      await apiFetch("/api/partners/reorder", { method: "POST", body: { ids: next.map((p) => p.id) } });
    } catch (moveError) {
      toast.error(errorMessage(moveError));
      reload();
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiFetch(`/api/partners/${deleting.id}`, { method: "DELETE" });
      toast.success("Partner deleted.");
      setDeleting(null);
      reload();
    } catch (deleteError) {
      toast.error(errorMessage(deleteError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Partners"
        description="These appear in the Our Trusted Partners section of the website."
        action={
          <button type="button" onClick={() => setEditing("new")} className="admin-btn admin-btn-primary">
            <Plus aria-hidden className="size-4" /> Add partner
          </button>
        }
      />

      {loading ? (
        <ListSkeleton />
      ) : error && !data ? (
        <LoadError message={error} onRetry={reload} />
      ) : partners.length === 0 ? (
        <AdminEmpty title="No partners yet" message="Add a partner logo to show it on the website." />
      ) : (
        <ul className="space-y-3">
          {partners.map((partner, index) => (
            <li key={partner.id} className={`admin-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${partner.enabled ? "" : "opacity-65"}`}>
              <SafeImage src={partner.logo} alt="" width={88} height={44} className="h-11 w-22 shrink-0 rounded-lg bg-admin-bg object-contain p-1" />
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-medium">{partner.name}</h2>
                {partner.url ? (
                  <a href={partner.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-sm text-admin-muted hover:text-admin-text">
                    <span className="truncate">{partner.url}</span> <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                  </a>
                ) : (
                  <p className="text-sm text-admin-muted">No website link</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Toggle label={`Show ${partner.name} on the website`} hideLabel checked={partner.enabled} onChange={(value) => void toggle(partner, value)} />
                <button type="button" aria-label={`Move ${partner.name} up`} disabled={index === 0} onClick={() => void move(index, -1)} className="admin-icon-btn">
                  <ArrowUp aria-hidden className="size-4" />
                </button>
                <button type="button" aria-label={`Move ${partner.name} down`} disabled={index === partners.length - 1} onClick={() => void move(index, 1)} className="admin-icon-btn">
                  <ArrowDown aria-hidden className="size-4" />
                </button>
                <button type="button" aria-label={`Edit ${partner.name}`} onClick={() => setEditing(partner)} className="admin-icon-btn">
                  <Pencil aria-hidden className="size-4" />
                </button>
                <button type="button" aria-label={`Delete ${partner.name}`} onClick={() => setDeleting(partner)} className="admin-icon-btn hover:text-status-offline!">
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add partner" : "Edit partner"}>
        {editing !== null && (
          <PartnerForm
            key={editing === "new" ? "new" : editing.id}
            partnerId={editing === "new" ? null : editing.id}
            initial={
              editing === "new"
                ? { name: "", logo: "", url: "", enabled: true, displayOrder: partners.length }
                : { ...editing, url: editing.url ?? "" }
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
        title="Delete partner?"
        message={`"${deleting?.name}" will be removed from the website. This cannot be undone.`}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
