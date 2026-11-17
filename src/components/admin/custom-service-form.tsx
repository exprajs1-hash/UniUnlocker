"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { SelectField, TextAreaField, TextField, Toggle } from "@/components/admin/form";
import { ImageField } from "@/components/admin/image-field";
import { useToast } from "@/components/ui/toast";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf } from "@/lib/client-api";
import type { AdminRentServiceDTO, ServiceCategoryDTO } from "@/types";

interface FieldDraft {
  /** Stable React key while editing. */
  key: number;
  name: string;
  /** Dropdown choices, one per line; empty = free text box. */
  options: string;
  required: boolean;
  sensitive: boolean;
}

/** Ready-made fields for the most common custom jobs, so the admin rarely types them. */
const PRESETS: Array<{ label: string; fields: Array<Omit<FieldDraft, "key">> }> = [
  {
    label: "UltraViewer",
    fields: [
      { name: "UltraViewer ID", options: "", required: true, sensitive: false },
      { name: "UltraViewer Password", options: "", required: true, sensitive: true },
    ],
  },
  {
    label: "AnyDesk",
    fields: [
      { name: "AnyDesk ID", options: "", required: true, sensitive: false },
      { name: "AnyDesk Password", options: "", required: false, sensitive: true },
    ],
  },
  { label: "IMEI", fields: [{ name: "IMEI", options: "", required: true, sensitive: false }] },
  { label: "Phone model", fields: [{ name: "Phone Model", options: "", required: true, sensitive: false }] },
  { label: "Note", fields: [{ name: "Note", options: "", required: false, sensitive: false }] },
];

let nextKey = 1;
const draftOf = (field: Omit<FieldDraft, "key">): FieldDraft => ({ ...field, key: nextKey++ });

/**
 * Create or edit a custom service: one the admin delivers by hand, with no provider.
 * The admin chooses what the customer must type when ordering (e.g. UltraViewer ID
 * and password); secret fields are hidden from the order once it is finished.
 */
export function CustomServiceForm({
  service,
  categories,
  onSaved,
  onCancel,
}: {
  service: AdminRentServiceDTO | null;
  categories: ServiceCategoryDTO[];
  onSaved: (service: AdminRentServiceDTO) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(service?.title || service?.name || "");
  const [category, setCategory] = useState(service?.category || categories.find((item) => !item.builtIn)?.slug || "rent");
  const [price, setPrice] = useState(service?.priceBdt != null ? String(service.priceBdt) : "");
  const [deliveryTime, setDeliveryTime] = useState(service?.deliveryTime ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [icon, setIcon] = useState(service?.icon ?? "");
  const [enabled, setEnabled] = useState(service?.enabled ?? true);
  const [fields, setFields] = useState<FieldDraft[]>(() =>
    (service?.customFields ?? PRESETS[0].fields).map((field) =>
      draftOf({
        name: field.name,
        options: Array.isArray(field.options) ? field.options.join("\n") : field.options,
        required: field.required,
        sensitive: field.sensitive ?? false,
      }),
    ),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const update = (key: number, change: Partial<FieldDraft>) =>
    setFields((current) => current.map((field) => (field.key === key ? { ...field, ...change } : field)));
  const move = (index: number, by: number) =>
    setFields((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item);
      return next;
    });
  const addPreset = (preset: (typeof PRESETS)[number]) =>
    setFields((current) => {
      const taken = new Set(current.map((field) => field.name.toLowerCase()));
      return [...current, ...preset.fields.filter((field) => !taken.has(field.name.toLowerCase())).map(draftOf)];
    });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    const customFields = fields
      .filter((field) => field.name.trim())
      .map((field) => ({
        name: field.name.trim(),
        options: field.options
          .split("\n")
          .map((option) => option.trim())
          .filter(Boolean),
        required: field.required,
        sensitive: field.sensitive,
      }));
    try {
      const result = service
        ? await apiFetch<{ service: AdminRentServiceDTO }>(`/api/rent-services/${service.id}`, {
            method: "PATCH",
            body: { name, title: "", category, priceBdt: price, deliveryTime, description, icon, customFields, enabled },
          })
        : await apiFetch<{ service: AdminRentServiceDTO }>("/api/rent-services", {
            method: "POST",
            body: { name, category, priceBdt: price, deliveryTime, description, icon, customFields, enabled },
          });
      toast.success(service ? "Custom service updated." : `"${name.trim()}" created.`);
      onSaved(result.service);
    } catch (error) {
      setErrors(fieldErrorsOf(error));
      toast.error(errorMessage(error));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-admin-text">
        You deliver this yourself. Orders wait as <b>Pending</b> in Rent Orders: open one, do the job, then mark it{" "}
        <b>Completed</b> with the result, or <b>Rejected</b> to refund the customer.
      </p>
      <TextField
        label="Service name"
        placeholder="e.g. Samsung FRP Remote Unlock"
        value={name}
        onChange={(value) => {
          setName(value);
          setErrors((current) => clearFieldError(current, "name"));
        }}
        error={errors.name}
        required
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField<string>
          label="Category"
          value={category}
          onChange={setCategory}
          error={errors.category}
          options={categories.map(({ slug, name: label, builtIn }) => ({ value: slug, label: builtIn ? label : `${label} (custom)` }))}
        />
        <TextField
          label="Price (BDT)"
          type="number"
          placeholder="e.g. 300 or 0.50"
          value={price}
          onChange={(value) => {
            setPrice(value);
            setErrors((current) => clearFieldError(current, "priceBdt"));
          }}
          error={errors.priceBdt}
          required
        />
      </div>
      <TextField
        label="Delivery time"
        placeholder="e.g. 10-30 Minutes"
        value={deliveryTime}
        onChange={setDeliveryTime}
        error={errors.deliveryTime}
      />

      <fieldset className="space-y-3 rounded-lg border border-admin-line p-3">
        <legend className="px-1 text-sm font-semibold">What the customer must enter</legend>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-admin-muted">Quick add:</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => addPreset(preset)}
              className="rounded-full border border-admin-line px-2.5 py-1 hover:border-primary hover:text-primary"
            >
              + {preset.label}
            </button>
          ))}
        </div>
        {fields.length === 0 && <p className="text-sm text-admin-muted">No fields: the customer just pays and orders.</p>}
        <ul className="space-y-2">
          {fields.map((field, index) => (
            <li key={field.key} className="rounded-lg bg-admin-raised p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    aria-label={`Field ${index + 1} name`}
                    value={field.name}
                    onChange={(event) => update(field.key, { name: event.target.value })}
                    placeholder="Field name, e.g. UltraViewer ID"
                    className="admin-input"
                  />
                  <textarea
                    aria-label={`Field ${index + 1} choices`}
                    value={field.options}
                    onChange={(event) => update(field.key, { options: event.target.value })}
                    placeholder="Dropdown choices, one per line (leave empty for a text box)"
                    rows={field.options ? 3 : 1}
                    className="admin-input text-sm"
                  />
                  <div className="flex flex-wrap gap-4">
                    <Toggle label="Required" checked={field.required} onChange={(value) => update(field.key, { required: value })} />
                    <Toggle
                      label="Secret (hide after finishing)"
                      checked={field.sensitive}
                      onChange={(value) => update(field.key, { sensitive: value })}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="admin-icon-btn disabled:opacity-30"
                  >
                    <ArrowUp aria-hidden className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={index === fields.length - 1}
                    onClick={() => move(index, 1)}
                    className="admin-icon-btn disabled:opacity-30"
                  >
                    <ArrowDown aria-hidden className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${field.name || "field"}`}
                    onClick={() => setFields((current) => current.filter((item) => item.key !== field.key))}
                    className="admin-icon-btn hover:text-status-offline!"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setFields((current) => [...current, draftOf({ name: "", options: "", required: true, sensitive: false })])}
          className="admin-btn admin-btn-secondary"
        >
          <Plus aria-hidden className="size-4" /> Add field
        </button>
        {errors.customFields && <p className="text-xs text-status-offline">{errors.customFields}</p>}
        {Object.entries(errors)
          .filter(([key]) => key.startsWith("customFields."))
          .slice(0, 1)
          .map(([key, message]) => (
            <p key={key} className="text-xs text-status-offline">
              {message}
            </p>
          ))}
      </fieldset>

      <ImageField label="Icon" value={icon} onChange={setIcon} error={errors.icon} hint="Square logo works best (PNG/WebP)." />
      <TextAreaField
        label="Description on website"
        hint="What the customer gets and what they need ready (e.g. phone on, UltraViewer open)."
        value={description}
        onChange={setDescription}
        error={errors.description}
        rows={4}
      />
      <Toggle label="Show on website" checked={enabled} onChange={setEnabled} />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="admin-btn admin-btn-primary">
          {busy ? "Saving…" : service ? "Save" : "Create service"}
        </button>
      </div>
    </form>
  );
}
