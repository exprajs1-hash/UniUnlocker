"use client";

import { ExternalLink, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { TextAreaField, TextField, Toggle } from "@/components/admin/form";
import { categoryHref, categoryIcon, CATEGORY_ICONS } from "@/components/rent/categories";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf } from "@/lib/client-api";
import { CATEGORY_ICON_NAMES, type CategoryIconName, type ServiceCategoryDTO } from "@/types";

function CategoryForm({
  category,
  onSaved,
  onCancel,
}: {
  category: ServiceCategoryDTO | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [icon, setIcon] = useState<CategoryIconName>(category?.icon ?? "globe");
  const [order, setOrder] = useState(String(category?.displayOrder ?? 0));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Name is required" });
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const body = { name, description, icon, displayOrder: order };
      if (category) {
        await apiFetch(`/api/rent-categories/${category.id}`, { method: "PATCH", body });
        toast.success("Category updated.");
      } else {
        await apiFetch("/api/rent-categories", { method: "POST", body });
        toast.success(`"${name.trim()}" created. Now put services in it from the list below.`);
      }
      onSaved();
    } catch (error) {
      setErrors(fieldErrorsOf(error));
      toast.error(errorMessage(error));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <TextField
        label="Name"
        placeholder="e.g. Remote Service"
        hint={category ? `Page: ${categoryHref(category.slug)} (stays the same if you rename it)` : "Shown in the Services menu and as the page title."}
        value={name}
        onChange={(value) => {
          setName(value);
          setErrors((current) => clearFieldError(current, "name"));
        }}
        error={errors.name}
        required
      />
      <TextAreaField
        label="Description"
        hint="One line under the page title. Optional."
        rows={2}
        value={description}
        onChange={setDescription}
        error={errors.description}
      />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Icon</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_ICON_NAMES.map((value) => {
            const Icon = CATEGORY_ICONS[value];
            const selected = value === icon;
            return (
              <button
                key={value}
                type="button"
                aria-label={value}
                aria-pressed={selected}
                onClick={() => setIcon(value)}
                className={`flex size-10 items-center justify-center rounded-lg border transition ${
                  selected ? "border-primary bg-primary/15 text-primary" : "border-admin-line text-admin-muted hover:text-admin-text"
                }`}
              >
                <Icon aria-hidden className="size-5" />
              </button>
            );
          })}
        </div>
      </fieldset>
      <TextField
        label="Order"
        type="number"
        hint="Lower numbers come first, after the built-in categories."
        value={order}
        onChange={setOrder}
        error={errors.displayOrder}
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="admin-btn admin-btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={busy} className="admin-btn admin-btn-primary">
          {busy ? "Saving…" : category ? "Save" : "Create category"}
        </button>
      </div>
    </form>
  );
}

/**
 * The website's service categories. The three built-in ones are fixed (provider
 * services are sorted into them automatically); the admin can add their own,
 * e.g. "Remote Service", and move services into them from the service editor.
 */
export function ServiceCategoriesPanel({ categories, onChanged }: { categories: ServiceCategoryDTO[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<ServiceCategoryDTO | "new" | null>(null);
  const [deleting, setDeleting] = useState<ServiceCategoryDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function toggle(category: ServiceCategoryDTO, enabled: boolean) {
    try {
      await apiFetch(`/api/rent-categories/${category.id}`, { method: "PATCH", body: { enabled } });
      toast.success(enabled ? `"${category.name}" is shown on the website.` : `"${category.name}" is hidden.`);
      onChanged();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const { movedServices } = await apiFetch<{ movedServices: number }>(`/api/rent-categories/${deleting.id}`, { method: "DELETE" });
      toast.success(
        movedServices > 0 ? `Category deleted. ${movedServices} services went back to Auto.` : "Category deleted.",
      );
      setDeleting(null);
      onChanged();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">Service categories</h2>
          <p className="text-xs text-admin-muted">
            Each category has its own page and appears in the website&apos;s Services menu. Edit a service below to put it in one.
          </p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className="admin-btn admin-btn-primary">
          <Plus aria-hidden className="size-4" /> Add category
        </button>
      </div>

      <ul className="divide-y divide-admin-line">
        {categories.map((category) => {
          const Icon = categoryIcon(category.icon);
          return (
            <li key={category.slug} className={`flex flex-wrap items-center gap-3 py-2.5 ${category.enabled ? "" : "opacity-60"}`}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Icon aria-hidden className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {category.name}
                  {category.builtIn && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded bg-admin-raised px-1.5 py-0.5 text-xs text-admin-muted">
                      <Lock aria-hidden className="size-3" /> Built-in
                    </span>
                  )}
                  {!category.enabled && <span className="ml-2 text-xs text-status-offline">Hidden</span>}
                </p>
                <a
                  href={categoryHref(category.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-admin-muted hover:text-primary"
                >
                  {categoryHref(category.slug)} <ExternalLink aria-hidden className="size-3" />
                </a>
              </div>
              {!category.builtIn && (
                <div className="flex items-center gap-2">
                  <Toggle
                    label={`Show ${category.name} on the website`}
                    hideLabel
                    checked={category.enabled}
                    onChange={(value) => void toggle(category, value)}
                  />
                  <button type="button" aria-label={`Edit ${category.name}`} onClick={() => setEditing(category)} className="admin-icon-btn">
                    <Pencil aria-hidden className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${category.name}`}
                    onClick={() => setDeleting(category)}
                    className="admin-icon-btn hover:text-status-offline!"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Add category" : "Edit category"}>
        {editing !== null && (
          <CategoryForm
            key={editing === "new" ? "new" : editing.id}
            category={editing === "new" ? null : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              onChanged();
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete category?"
        message={`"${deleting?.name}" and its page will be removed. Its services are not deleted: they go back to their automatic category. To hide it for now instead, turn it off.`}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}
