"use client";

import { useMemo, useState } from "react";
import { SortableList } from "@/components/admin/sortable";
import { formatBdt, ToolIcon } from "@/components/rent/shared";
import { useToast } from "@/components/ui/toast";
import { apiFetch, errorMessage } from "@/lib/client-api";
import type { AdminRentServiceDTO, ServiceCategoryDTO } from "@/types";

/**
 * Drag the services of one category into the order customers see on that
 * category's page (and in the homepage blocks). Saved as soon as an item is dropped.
 */
export function ArrangeServices({
  services,
  categories,
  onSaved,
}: {
  services: AdminRentServiceDTO[];
  categories: ServiceCategoryDTO[];
  onSaved: (ordered: AdminRentServiceDTO[]) => void;
}) {
  const [category, setCategory] = useState(categories[0]?.slug ?? "rent");
  const toast = useToast();

  // Only services shown on the website, in their current website order.
  const inCategory = useMemo(
    () =>
      services
        .filter((service) => service.enabled && service.effectiveCategory === category)
        .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
    [services, category],
  );

  async function save(next: AdminRentServiceDTO[]) {
    const ordered = next.map((service, index) => ({ ...service, displayOrder: index }));
    onSaved(ordered);
    try {
      await apiFetch("/api/rent-services/reorder", { method: "POST", body: { ids: ordered.map((service) => service.id) } });
      toast.success("Order saved.");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {categories.map((item) => {
          const count = services.filter((service) => service.enabled && service.effectiveCategory === item.slug).length;
          return (
            <button
              key={item.slug}
              type="button"
              aria-pressed={item.slug === category}
              onClick={() => setCategory(item.slug)}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                item.slug === category
                  ? "border-primary bg-primary/15 font-semibold text-primary"
                  : "border-admin-line text-admin-muted hover:text-admin-text"
              }`}
            >
              {item.name} ({count})
            </button>
          );
        })}
      </div>
      <p className="text-xs text-admin-muted">Drag ⋮⋮ to move a service. The top one shows first on the website. Saved automatically.</p>
      {inCategory.length === 0 ? (
        <p className="py-6 text-center text-sm text-admin-muted">No services shown in this category yet.</p>
      ) : (
        <SortableList
          items={inCategory}
          onCommit={(next) => void save(next)}
          label={(service) => service.title || service.name}
          className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1"
          itemClassName={() => "flex items-center gap-3 rounded-lg border border-admin-line bg-admin-panel p-2"}
        >
          {(service, handle) => (
            <>
              {handle}
              <ToolIcon src={service.icon} name={service.title || service.name} size={32} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{service.title || service.name}</span>
              <span className="shrink-0 text-sm font-semibold">{formatBdt(service.effectivePriceBdt)}</span>
            </>
          )}
        </SortableList>
      )}
    </div>
  );
}
