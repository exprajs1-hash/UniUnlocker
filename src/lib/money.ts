/**
 * Money is kept in taka with up to 2 decimals (paisa), e.g. 0.5 or 116.27.
 * Always round through these helpers so float noise (0.1 + 0.2 = 0.30000000000000004)
 * never reaches a price or a balance.
 */

/** Removes float noise first, so 1.005 * 100 = 100.49999999999999 still rounds as 100.5. */
function cents(value: number): number {
  return Number((value * 100).toFixed(6));
}

/** Nearest paisa. */
export function roundMoney(value: number): number {
  return Math.round(cents(value)) / 100;
}

/** Rounded up to the next paisa: for prices, so a sale never comes in under cost. */
export function ceilMoney(value: number): number {
  return Math.ceil(cents(value)) / 100;
}

/** A finite amount with at most 2 decimals. */
export function isMoney(value: number): boolean {
  return Number.isFinite(value) && Math.abs(Math.round(cents(value)) - cents(value)) < 1e-6;
}

const WHOLE = new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 });
const PAISA = new Intl.NumberFormat("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "৳117" for whole taka, "৳0.50" / "৳116.27" when there are paisa. */
export function formatTaka(amount: number): string {
  const rounded = roundMoney(amount);
  return `৳${Number.isInteger(rounded) ? WHOLE.format(rounded) : PAISA.format(rounded)}`;
}
