export interface Paged<T> {
  items: T[];
  page: number;
  totalPages: number;
  /** Index of the first item on this page, for "Showing X–Y of Z" and numbering. */
  start: number;
  total: number;
}

export type SearchParamValue = string | string[] | undefined;

export function firstParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Slices one page out of a list; a missing, invalid or out-of-range page clamps to the nearest valid one. */
export function paginate<T>(all: readonly T[], rawPage: SearchParamValue, pageSize: number): Paged<T> {
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const requested = Number.parseInt(firstParam(rawPage) ?? "1", 10);
  const page = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), totalPages) : 1;
  const start = (page - 1) * pageSize;
  return { items: all.slice(start, start + pageSize), page, totalPages, start, total };
}

/** Page numbers to show, with null marking a gap: 1 … 4 5 6 … 12. */
export function pageWindow(page: number, totalPages: number): Array<number | null> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  return sorted.flatMap((n, index) => (index > 0 && n - sorted[index - 1] > 1 ? [null, n] : [n]));
}

/** Builds a listing URL, dropping page=1 so the first page has one canonical address. */
export function listingHref(basePath: string, params: Record<string, string | undefined>, page = 1): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  if (page > 1) query.set("page", String(page));
  const text = query.toString();
  return text ? `${basePath}?${text}` : basePath;
}
