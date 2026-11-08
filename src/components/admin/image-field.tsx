"use client";

import { ImagePlus, Link2, Search, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRef, useState, type FormEvent } from "react";
import { FormField, TextField } from "@/components/admin/form";
import { Modal } from "@/components/ui/modal";
import { SafeImage } from "@/components/ui/safe-image";
import { useToast } from "@/components/ui/toast";
import { useResource } from "@/hooks/use-resource";
import { apiFetch, errorMessage } from "@/lib/client-api";
import type { PexelsPhoto } from "@/types";

function PexelsPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (url: string) => void }) {
  const [query, setQuery] = useState("smartphone repair");
  const [photos, setPhotos] = useState<PexelsPhoto[] | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function search(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    setBusy(true);
    try {
      const result = await apiFetch<{ photos: PexelsPhoto[] }>(`/api/pexels?q=${encodeURIComponent(query)}`);
      setPhotos(result.photos);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Choose a photo from Pexels" className="max-w-3xl">
      <form onSubmit={search} className="flex gap-2">
        <input
          aria-label="Search Pexels"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="admin-input"
        />
        <button type="submit" disabled={busy} className="admin-btn admin-btn-primary">
          <Search aria-hidden className="size-4" /> {busy ? "Searching…" : "Search"}
        </button>
      </form>
      {photos && photos.length === 0 && <p className="mt-6 text-center text-sm text-admin-muted">No photos found. Try other words.</p>}
      {photos && photos.length > 0 && (
        <ul className="mt-4 grid max-h-[26rem] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
          {photos.map((photo) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(photo.url);
                  onClose();
                }}
                className="group w-full text-left"
              >
                <span className="relative block aspect-[3/2] overflow-hidden rounded-lg border border-admin-line group-hover:border-primary">
                  <Image src={photo.thumb} alt={photo.alt} fill sizes="240px" className="object-cover" />
                </span>
                <span className="mt-1 block truncate text-xs text-admin-muted">Photo by {photo.photographer}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="admin-btn admin-btn-secondary">
      <Trash2 aria-hidden className="size-4" /> Remove
    </button>
  );
}

type Mode = "upload" | "url";

/** Images uploaded through this field live on Cloudinary; anything else was pasted or picked. */
function modeOf(value: string): Mode {
  if (!value) return "upload";
  try {
    return new URL(value).hostname === "res.cloudinary.com" ? "upload" : "url";
  } catch {
    return "url";
  }
}

const MODES: Array<{ value: Mode; label: string; icon: typeof Upload }> = [
  { value: "upload", label: "Upload", icon: Upload },
  { value: "url", label: "Image URL", icon: Link2 },
];

/**
 * Image input with two exclusive sources: upload a file, or use a link (pasted
 * or picked from Pexels). While an image is set, the other source is locked
 * until the image is removed, so it is always clear where the image came from.
 */
export function ImageField({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  error?: string;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // A saved image opens on the tab it most likely came from; after that the tab
  // only changes when the admin switches it, which is allowed while the field is empty.
  const [mode, setMode] = useState<Mode>(() => modeOf(value));
  const { data: sources } = useResource<{ uploads: boolean; pexels: boolean }>("/api/upload");
  const toast = useToast();
  const locked = Boolean(value) || uploading;

  async function upload(file: File) {
    const body = new FormData();
    body.set("file", file);
    setUploading(true);
    try {
      const { url } = await apiFetch<{ url: string }>("/api/upload", { method: "POST", body });
      onChange(url);
      toast.success("Image uploaded. Save to apply it.");
    } catch (uploadError) {
      toast.error(errorMessage(uploadError));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-lg border border-admin-line p-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex aspect-3/2 w-full shrink-0 items-center justify-center overflow-hidden rounded-md bg-admin-bg sm:w-40">
          {value ? (
            <SafeImage src={value} alt={`${label} preview`} fill sizes="160px" className="object-cover" />
          ) : (
            <ImagePlus aria-hidden className="size-7 text-admin-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div role="group" aria-label={`${label} source`} className="inline-flex rounded-lg bg-admin-bg p-1">
            {MODES.map(({ value: option, label: optionLabel, icon: Icon }) => {
              const active = mode === option;
              const disabled = !active && locked;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  disabled={disabled}
                  title={disabled ? "Remove the current image to switch" : undefined}
                  onClick={() => setMode(option)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    active ? "bg-admin-raised text-admin-text" : "text-admin-muted hover:text-admin-text"
                  }`}
                >
                  <Icon aria-hidden className="size-3.5" /> {optionLabel}
                </button>
              );
            })}
          </div>

          {mode === "upload" ? (
            <FormField
              label={label}
              error={error}
              hint={hint ?? (value ? "Uploaded. Remove it to choose another file or use a link." : "JPG, PNG, WebP, GIF or ICO, up to 5 MB.")}
            >
              {(fieldProps) => (
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon"
                    tabIndex={-1}
                    aria-hidden
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void upload(file);
                    }}
                  />
                  <button
                    {...fieldProps}
                    type="button"
                    disabled={uploading || sources?.uploads === false}
                    title={sources?.uploads === false ? "Add Cloudinary keys to enable uploads" : undefined}
                    onClick={() => inputRef.current?.click()}
                    className="admin-btn admin-btn-secondary"
                  >
                    <Upload aria-hidden className="size-4" />
                    {uploading ? "Uploading…" : value ? "Replace file" : "Choose file"}
                  </button>
                  {value && <RemoveButton onClick={() => onChange("")} />}
                </div>
              )}
            </FormField>
          ) : (
            <>
              <TextField
                label={label}
                value={value}
                onChange={onChange}
                error={error}
                hint={hint ?? "Paste a direct image link (right-click an image → Copy image address)."}
                placeholder="https://"
              />
              <div className="flex flex-wrap gap-2">
                {sources?.pexels && (
                  <button type="button" onClick={() => setPickerOpen(true)} className="admin-btn admin-btn-secondary">
                    <Search aria-hidden className="size-4" /> Pexels
                  </button>
                )}
                {value && <RemoveButton onClick={() => onChange("")} />}
              </div>
            </>
          )}

          {mode === "upload" && sources?.uploads === false && (
            <p className="text-xs text-status-maintenance">Uploads are off until Cloudinary keys are added. Use Image URL instead.</p>
          )}
        </div>
      </div>
      {sources?.pexels && <PexelsPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={onChange} />}
    </div>
  );
}
