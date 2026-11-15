import type { ServerDTO } from "@/types";

export const DEFAULT_USD_TO_BDT = 130;

export type CostCurrency = "USD" | "BDT";

/** Reads a provider's currency ("BDT", "Tk", "৳", "Taka"…); anything else counts as USD. */
export function normalizeCurrency(raw: unknown): CostCurrency {
  const text = String(raw ?? "").trim().toUpperCase();
  return /BDT|TAKA|^TK\.?$|৳/.test(text) ? "BDT" : "USD";
}

/** A provider cost in its own currency, e.g. "$1.25" or "৳150". */
export function formatCost(amount: number, currency: CostCurrency | undefined): string {
  return currency === "BDT" ? `৳${amount}` : `$${amount}`;
}

/**
 * Fills in the missing currency from the admin's exchange rate (1 USD = `rate`
 * BDT). Prices the admin typed are never changed; a calculated one is flagged
 * in `convertedCurrency` so the site can mark it as approximate.
 */
export function withConvertedPrices(server: ServerDTO, rate: number): ServerDTO {
  const bdt = server.priceBdt ?? null;
  const usd = server.priceUsd ?? null;
  if (!(rate > 0) || (bdt === null) === (usd === null)) {
    return { ...server, priceBdt: bdt, priceUsd: usd, convertedCurrency: null };
  }
  if (bdt === null) {
    return { ...server, priceBdt: Math.round(usd! * rate), priceUsd: usd, convertedCurrency: "BDT" };
  }
  return { ...server, priceBdt: bdt, priceUsd: Math.round((bdt / rate) * 100) / 100, convertedCurrency: "USD" };
}
