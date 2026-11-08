"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AdminEmpty, ListSkeleton, LoadError, PageHeader, TextAreaField, TextField, Toggle } from "@/components/admin/form";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useResource } from "@/hooks/use-resource";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf, moved } from "@/lib/client-api";
import { getServiceIcon, SERVICE_ICON_NAMES } from "@/lib/service-icons";
import type { ServiceDTO } from "@/types";

type Draft = Pick<ServiceDTO, "title" | "description" | "icon" | "displayOrder" | "enabled">;

function ServiceForm({
  initial,
  serviceId,
  onSaved,
  onCancel,
}: {
  initial: Draft;
  serviceId: string | null;
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
      await apiFetch(serviceId ? `/api/services/${serviceId}` : "/api/services", {
        method: serviceId ? "PUT" : "POST",
        body: draft,
      });
      toast.success(serviceId ? "Service updated." : "Service added.");
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
      <TextField label="Title" value={draft.title} onChange={(value) => set("title", value)} error={errors.title} required />
      <TextAreaField label="Description" rows={3} value={draft.description} onChange={(value) => set("description", value)} error={errors.description} />
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Icon</legend>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
          {SERVICE_ICON_NAMES.map((name) => {
            const Icon = getServiceIcon(name);
            const selected = draft.icon === name;
            return (
              <button
                key={name}
                type="button"
                aria-label={name}
                aria-pressed={selected}
                title={name}
                onClick={() => set("icon", name)}
                className={`flex aspect-square items-center justify-center rounded-lg border transition ${
                  selected ? "border-primary bg-primary/20 text-admin-text" : "border-admin-line text-admin-muted hover:text-admin-text"
                }`}
              >
                <Icon aria-hidden className="size-5" />
              </button>
            );
          })}
        </div>
      </fieldset>
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
          {busy ? "Saving…" : "Save service"}
        </button>
      </div>
    </form>
  );
}

export function ServicesManager() {
  const { data, error, loading, reload, setData } = useResource<{ services: ServiceDTO[] }>("/api/services?all=1");
  const [editing, setEditing] = useState<ServiceDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<ServiceDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const services = data?.services ?? [];

  async function toggle(service: ServiceDTO, enabled: boolean) {
    const apply = (value: boolean) =>
      setData((current) =>
        current && { services: current.services.map((s) => (s.id === service.id ? { ...s, enabled: value } : s)) },
      );
    apply(enabled);
    try {
      await apiFetch(`/api/services/${service.id}`, { method: "PATCH", body: { enabled } });
      toast.success(enabled ? `${service.title} enabled.` : `${service.title} hidden.`);
    } catch (toggleError) {
      apply(!enabled);
      toast.error(errorMessage(toggleError));
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = moved(services, index, direction);
    if (!next) return;
    setData(() => ({ services: next }));
    try {
      await apiFetch("/api/services/reorder", { method: "POST", body: { ids: next.map((s) => s.id) } });
    } catch (moveError) {
      toast.error(errorMessage(moveError));
      reload();
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiFetch(`/api/services/${deleting.id}`, { method: "DELETE" });
      toast.success("Service deleted.");
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
        title="Services"
        description="These appear in the My Services section of the website."
        action={
          <button type="button" onClick={() => setEditing("new")} className="admin-btn admin-btn-primary">
            <Plus aria-hidden className="size-4" /> Add service
          </button>
        }
      />

      {loading ? (
        <ListSkeleton />
      ) : error && !data ? (
        <LoadError message={error} onRetry={reload} />
      ) : services.length === 0 ? (
        <AdminEmpty title="No services yet" message="Add a service to show it on the website." />
      ) : (
        <ul className="space-y-3">
          {services.map((service, index) => {
            const Icon = getServiceIcon(service.icon);
            return (
              <li key={service.id} className={`admin-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${service.enabled ? "" : "opacity-65"}`}>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon aria-hidden className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-medium">{service.title}</h2>
                  <p className="text-sm text-admin-muted">{service.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Toggle label={`Show ${service.title} on the website`} hideLabel checked={service.enabled} onChange={(value) => void toggle(service, value)} />
                  <button type="button" aria-label={`Move ${service.title} up`} disabled={index === 0} onClick={() => void move(index, -1)} className="admin-icon-btn">
                    <ArrowUp aria-hidden className="size-4" />
                  </button>
                  <button type="button" aria-label={`Move ${service.title} down`} disabled={index === services.length - 1} onClick={() => void move(index, 1)} className="admin-icon-btn">
                    <ArrowDown aria-hidden className="size-4" />
                  </button>
                  <button type="button" aria-label={`Edit ${service.title}`} onClick={() => setEditing(service)} className="admin-icon-btn">
                    <Pencil aria-hidden className="size-4" />
                  </button>
                  <button type="button" aria-label={`Delete ${service.title}`} onClick={() => setDeleting(service)} className="admin-icon-btn hover:text-status-offline!">
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add service" : "Edit service"}>
        {editing !== null && (
          <ServiceForm
            key={editing === "new" ? "new" : editing.id}
            serviceId={editing === "new" ? null : editing.id}
            initial={
              editing === "new"
                ? { title: "", description: "", icon: "Wrench", displayOrder: services.length, enabled: true }
                : editing
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
        title="Delete service?"
        message={`"${deleting?.title}" will be removed from the website. This cannot be undone.`}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
