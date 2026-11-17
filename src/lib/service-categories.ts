import { RENT_CATEGORIES, RENT_CATEGORY_LABELS, type CategoryIconName, type RentCategory, type ServiceCategoryDTO } from "@/types";

/** Safe to import in the browser: no database code here. */

const BUILT_IN_ICONS: Record<RentCategory, CategoryIconName> = { rent: "key", imei: "smartphone", server: "server" };

const BUILT_IN_DESCRIPTIONS: Record<RentCategory, string> = {
  rent: "Rent premium unlock and repair tools by the hour. Login details are delivered fast and paid from your balance.",
  imei: "Official IMEI unlock, check and repair services for every major brand. Fast delivery, guaranteed results.",
  server: "Server credits, activations and remote services, processed quickly and paid straight from your balance.",
};

export const BUILT_IN_CATEGORIES: ServiceCategoryDTO[] = RENT_CATEGORIES.map((slug, index) => ({
  id: "",
  slug,
  name: RENT_CATEGORY_LABELS[slug],
  description: BUILT_IN_DESCRIPTIONS[slug],
  icon: BUILT_IN_ICONS[slug],
  builtIn: true,
  enabled: true,
  displayOrder: index,
}));

export function isBuiltInCategory(slug: string): slug is RentCategory {
  return (RENT_CATEGORIES as readonly string[]).includes(slug);
}

/** A service id is 24 hex characters; a category slug must never look like one, or /services/<x> would be ambiguous. */
const OBJECT_ID = /^[a-f\d]{24}$/i;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isServiceId(value: string): boolean {
  return OBJECT_ID.test(value);
}

/** "Remote Service!" → "remote-service". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

/** Why a slug cannot be used, or null when it is fine. */
export function slugProblem(slug: string): string | null {
  if (!slug) return "Use letters or numbers in the name";
  if (!SLUG_PATTERN.test(slug)) return "Use only lowercase letters, numbers and dashes";
  if (isBuiltInCategory(slug)) return "This name is already used by a built-in category";
  if (isServiceId(slug)) return "Choose a different name";
  return null;
}
