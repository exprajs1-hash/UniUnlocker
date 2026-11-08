export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

/** Fetch wrapper for the admin panel: JSON in and out, typed errors, redirect when signed out. */
export async function apiFetch<T>(url: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      cache: "no-store",
      headers: options.body && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: isForm ? (options.body as FormData) : options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiClientError("Could not reach the server. Check your connection.", 0);
  }

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    fieldErrors?: Record<string, string>;
  };

  if (!response.ok) {
    if (response.status === 401 && !url.startsWith("/api/auth/")) {
      // This runs outside React, and the hard reload also drops cached admin pages.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/admin/login";
    }
    throw new ApiClientError(body.error ?? "Something went wrong.", response.status, body.fieldErrors);
  }
  return body as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function fieldErrorsOf(error: unknown): Record<string, string> {
  return error instanceof ApiClientError ? error.fieldErrors : {};
}

/** Drops one field's message, so an error disappears as soon as the field is edited. */
export function clearFieldError(errors: Record<string, string>, field: string): Record<string, string> {
  if (!(field in errors)) return errors;
  const next = { ...errors };
  delete next[field];
  return next;
}

/** Returns a copy with the item at `index` moved one place, or null at either end. */
export function moved<T>(list: T[], index: number, direction: -1 | 1): T[] | null {
  const target = index + direction;
  if (target < 0 || target >= list.length) return null;
  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}
