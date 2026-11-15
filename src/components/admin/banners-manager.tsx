"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AdminEmpty, ListSkeleton, LoadError, PageHeader, TextField, Toggle } from "@/components/admin/form";
import { ImageField } from "@/components/admin/image-field";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { SafeImage } from "@/components/ui/safe-image";
import { useToast } from "@/components/ui/toast";
import { useResource } from "@/hooks/use-resource";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf, moved } from "@/lib/client-api";
import type { BannerDTO } from "@/types";

type Draft = Omit<BannerDTO, "id">;

const EMPTY: Omit<Draft, "displayOrder"> = { image: "", title: "", subtitle: "", url: "", buttonLabel: "", enabled: true };

function BannerForm({
  initial,
  bannerId,
  onSaved,
  onCancel,
}: {
  initial: Draft;
  bannerId: string | null;
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
      await apiFetch(bannerId ? `/api/banners/${bannerId}` : "/api/banners", {
        method: bannerId ? "PUT" : "POST",
        body: draft,
      });
      toast.success(bannerId ? "Banner updated." : "Banner added.");
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
      <ImageField
        label="Banner image"
        value={draft.image}
        onChange={(value) => set("image", value)}
        error={errors.image}
        hint="Wide image, about 1600 × 600 px (8:3). Keep important parts in the middle; phones crop the sides a little."
      />
      <TextField
        label="Title (optional)"
        hint="Shown over the image. Leave blank if the image already has its own text."
        value={draft.title}
        onChange={(value) => set("title", value)}
        error={errors.title}
      />
      <TextField label="Subtitle (optional)" value={draft.subtitle} onChange={(value) => set("subtitle", value)} error={errors.subtitle} />
      <TextField
        label="Link (optional)"
        type="url"
        placeholder="https://uniunlocker.com/rent"
        hint="Where the banner goes when clicked."
        value={draft.url}
        onChange={(value) => set("url", value)}
        error={errors.url}
      />
      <TextField
        label="Button text (optional)"
        placeholder="Rent now"
        hint="With a link and button text, a button is shown. With only a link, the whole banner is clickable."
        value={draft.buttonLabel}
        onChange={(value) => set("buttonLabel", value)}
        error={errors.buttonLabel}
      />
      <Toggle label="Show on the home page" checked={draft.enabled} onChange={(value) => set("enabled", value)} />
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="admin-btn admin-btn-primary">
          {busy ? "Saving…" : "Save banner"}
        </button>
      </div>
    </form>
  );
}

export function BannersManager() {
  const { data, error, loading, reload, setData } = useResource<{ banners: BannerDTO[] }>("/api/banners?all=1");
  const [editing, setEditing] = useState<BannerDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<BannerDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const banners = data?.banners ?? [];
  const label = (banner: BannerDTO, index: number) => banner.title || `Banner ${index + 1}`;

  async function toggle(banner: BannerDTO, enabled: boolean) {
    const apply = (value: boolean) =>
      setData((current) => current && { banners: current.banners.map((b) => (b.id === banner.id ? { ...b, enabled: value } : b)) });
    apply(enabled);
    try {
      await apiFetch(`/api/banners/${banner.id}`, { method: "PATCH", body: { enabled } });
      toast.success(enabled ? "Banner shown on the home page." : "Banner hidden.");
    } catch (toggleError) {
      apply(!enabled);
      toast.error(errorMessage(toggleError));
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = moved(banners, index, direction);
    if (!next) return;
    setData(() => ({ banners: next }));
    try {
      await apiFetch("/api/banners/reorder", { method: "POST", body: { ids: next.map((b) => b.id) } });
    } catch (moveError) {
      toast.error(errorMessage(moveError));
      reload();
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiFetch(`/api/banners/${deleting.id}`, { method: "DELETE" });
      toast.success("Banner deleted.");
      setDeleting(null);
      reload();
    } catch (deleteError) {
      toast.error(errorMessage(deleteError));
    } finally {
      setBusy(false);
    }
  }

  const enabledCount = banners.filter((banner) => banner.enabled).length;

  return (
    <>
      <PageHeader
        title="Banners"
        description={`The slider below the hero on the home page. It only appears while at least one banner is shown (${enabledCount} shown now).`}
        action={
          <button type="button" onClick={() => setEditing("new")} className="admin-btn admin-btn-primary">
            <Plus aria-hidden className="size-4" /> Add banner
          </button>
        }
      />

      {loading ? (
        <ListSkeleton />
      ) : error && !data ? (
        <LoadError message={error} onRetry={reload} />
      ) : banners.length === 0 ? (
        <AdminEmpty title="No banners yet" message="Add a banner to show a slider on the home page." />
      ) : (
        <ul className="space-y-3">
          {banners.map((banner, index) => (
            <li
              key={banner.id}
              className={`admin-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${banner.enabled ? "" : "opacity-65"}`}
            >
              <span className="relative block aspect-8/3 w-full shrink-0 overflow-hidden rounded-lg bg-admin-bg sm:w-48">
                <SafeImage src={banner.image} alt="" fill sizes="192px" className="object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-medium">{label(banner, index)}</h2>
                {banner.subtitle && <p className="truncate text-sm text-admin-muted">{banner.subtitle}</p>}
                <p className="truncate text-xs text-admin-muted">
                  {banner.url ? `Links to ${banner.url}${banner.buttonLabel ? ` · button "${banner.buttonLabel}"` : ""}` : "No link"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Toggle
                  label={`Show ${label(banner, index)} on the home page`}
                  hideLabel
                  checked={banner.enabled}
                  onChange={(value) => void toggle(banner, value)}
                />
                <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => void move(index, -1)} className="admin-icon-btn">
                  <ArrowUp aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index === banners.length - 1}
                  onClick={() => void move(index, 1)}
                  className="admin-icon-btn"
                >
                  <ArrowDown aria-hidden className="size-4" />
                </button>
                <button type="button" aria-label={`Edit ${label(banner, index)}`} onClick={() => setEditing(banner)} className="admin-icon-btn">
                  <Pencil aria-hidden className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${label(banner, index)}`}
                  onClick={() => setDeleting(banner)}
                  className="admin-icon-btn hover:text-status-offline!"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add banner" : "Edit banner"}>
        {editing !== null && (
          <BannerForm
            key={editing === "new" ? "new" : editing.id}
            bannerId={editing === "new" ? null : editing.id}
            initial={editing === "new" ? { ...EMPTY, displayOrder: banners.length } : { ...EMPTY, ...editing }}
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
        title="Delete banner?"
        message="This banner will be removed from the home page slider. This cannot be undone."
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
