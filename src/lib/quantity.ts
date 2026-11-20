/**
 * How many units a customer may order of one service. The provider's limits are
 * copied in by sync; the admin may override them per service, and sync never
 * touches the override.
 *   auto   – the provider's limits
 *   locked – always the provider's minimum (usually 1), no quantity box
 *   open   – the admin's own min–max
 */
export const QUANTITY_MODES = ["auto", "locked", "open"] as const;
export type QuantityMode = (typeof QUANTITY_MODES)[number];

/** The largest quantity accepted in one order, whatever the provider or admin allows. */
export const MAX_ORDER_QUANTITY = 1000;

export interface QuantitySource {
  minQuantity?: number | null;
  maxQuantity?: number | null;
  quantityMode?: string | null;
  customMinQuantity?: number | null;
  customMaxQuantity?: number | null;
}

const clamp = (value: number) => Math.min(Math.max(Math.floor(value) || 1, 1), MAX_ORDER_QUANTITY);

export function effectiveQuantityLimits(service: QuantitySource): { minQuantity: number; maxQuantity: number } {
  const providerMin = clamp(service.minQuantity ?? 1);
  const providerMax = Math.max(clamp(service.maxQuantity ?? 1), providerMin);
  if (service.quantityMode === "locked") return { minQuantity: providerMin, maxQuantity: providerMin };
  if (service.quantityMode === "open") {
    const min = clamp(service.customMinQuantity ?? 1);
    return { minQuantity: min, maxQuantity: Math.max(clamp(service.customMaxQuantity ?? min), min) };
  }
  return { minQuantity: providerMin, maxQuantity: providerMax };
}
