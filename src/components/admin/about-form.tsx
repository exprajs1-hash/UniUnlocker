"use client";

import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ListSkeleton, LoadError, PageHeader, TextAreaField, TextField } from "@/components/admin/form";
import { ImageField } from "@/components/admin/image-field";
import { useToast } from "@/components/ui/toast";
import { useResource } from "@/hooks/use-resource";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf } from "@/lib/client-api";
import type { AboutDTO } from "@/types";

function ListEditor({
  label,
  items,
  placeholder,
  error,
  onChange,
}: {
  label: string;
  items: string[];
  placeholder: string;
  error?: string;
  onChange: (items: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function add() {
    const value = input.trim();
    if (!value || items.includes(value)) return;
    onChange([...items, value]);
    setInput("");
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="flex gap-2">
        <input
          aria-label={`Add to ${label}`}
          value={input}
          placeholder={placeholder}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          className="admin-input"
        />
        <button type="button" onClick={add} className="admin-btn admin-btn-secondary">
          <Plus aria-hidden className="size-4" /> Add
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-status-offline">{error}</p>}
      {items.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-1.5 rounded-md bg-admin-raised py-1 pr-1 pl-2.5 text-sm">
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() => onChange(items.filter((other) => other !== item))}
                className="rounded p-0.5 text-admin-muted hover:text-admin-text"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AboutEditor({ initial }: { initial: AboutDTO }) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const set = <K extends keyof AboutDTO>(key: K, value: AboutDTO[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => clearFieldError(current, key));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await apiFetch("/api/about", { method: "PUT", body: draft });
      toast.success("About section saved.");
    } catch (error) {
      setErrors(fieldErrorsOf(error));
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="admin-card max-w-3xl space-y-4 p-5">
      <TextField label="Title" value={draft.title} error={errors.title} required onChange={(value) => set("title", value)} />
      <TextAreaField label="Description" rows={5} value={draft.description} error={errors.description} onChange={(value) => set("description", value)} />
      <ImageField label="Section image" value={draft.image} error={errors.image} onChange={(value) => set("image", value)} />
      <ImageField label="Profile image" value={draft.profileImage} error={errors.profileImage} hint="Optional. Shown beside the title." onChange={(value) => set("profileImage", value)} />
      <TextField label="Experience" value={draft.experience} error={errors.experience} placeholder="e.g. 5+ years of experience" onChange={(value) => set("experience", value)} />
      <TextField label="Signature" value={draft.signature} error={errors.signature} onChange={(value) => set("signature", value)} />
      <ListEditor label="Features" items={draft.features} placeholder="e.g. Fast & Reliable Service" error={errors.features} onChange={(value) => set("features", value)} />
      <ListEditor label="Skills" items={draft.skills} placeholder="e.g. Android" error={errors.skills} onChange={(value) => set("skills", value)} />
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={busy} className="admin-btn admin-btn-primary">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export function AboutForm() {
  const { data, error, loading, reload } = useResource<{ about: AboutDTO }>("/api/about");
  return (
    <>
      <PageHeader title="About" description="Content for the About Me section of the website." />
      {loading ? (
        <ListSkeleton rows={3} />
      ) : data ? (
        <AboutEditor initial={data.about} />
      ) : (
        <LoadError message={error ?? "Could not load this content."} onRetry={reload} />
      )}
    </>
  );
}
