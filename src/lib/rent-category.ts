import type { RentCategory } from "@/types";

/**
 * Best guess for where a provider service belongs on the website, used when
 * the admin has not picked a category. "Rent" in the name or a REMOTE
 * service is a tool rent; otherwise the provider's SERVER/IMEI type decides.
 */
export function detectCategory(type: string, name: string): RentCategory {
  if (/\brent(al)?\b/i.test(name)) return "rent";
  const kind = type.trim().toUpperCase();
  if (kind === "REMOTE") return "rent";
  if (kind === "SERVER") return "server";
  return "imei";
}

/** The admin's choice, or the detected one when left on "Auto". */
export function effectiveCategory(service: { category?: string; type: string; name: string }): RentCategory {
  const chosen = service.category;
  return chosen === "rent" || chosen === "imei" || chosen === "server" ? chosen : detectCategory(service.type, service.name);
}
