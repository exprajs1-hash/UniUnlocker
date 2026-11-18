export const SERVER_STATUSES = ["online", "offline", "maintenance"] as const;
export type ServerStatus = (typeof SERVER_STATUSES)[number];

export type OverallStatus =
  | "operational"
  | "partial_outage"
  | "major_outage"
  | "under_maintenance"
  | "unknown";

export const PROJECT_STATUSES = ["published", "draft"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface ProjectDTO {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  category: string;
  image: string;
  projectUrl: string;
  featured: boolean;
  status: ProjectStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceDTO {
  id: string;
  title: string;
  description: string;
  icon: string;
  displayOrder: number;
  enabled: boolean;
}

export interface BannerDTO {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  url: string;
  buttonLabel: string;
  displayOrder: number;
  enabled: boolean;
}

export interface PartnerDTO {
  id: string;
  name: string;
  logo: string;
  /** Partner website; blank means the logo is not a link. */
  url: string;
  displayOrder: number;
  enabled: boolean;
}

export interface ToolDTO {
  id: string;
  name: string;
  logo: string;
  /** Where the card links to; blank means the logo is not a link. */
  url: string;
  displayOrder: number;
  enabled: boolean;
}

export interface ServerDTO {
  id: string;
  name: string;
  description: string;
  logo: string;
  /** Prices per currency; null or missing means no price is shown for that currency. */
  priceBdt?: number | null;
  priceUsd?: number | null;
  /** Public data only: which of the two prices was calculated from the exchange rate. */
  convertedCurrency?: "BDT" | "USD" | null;
  status: ServerStatus;
  enabled: boolean;
  displayOrder: number;
  statusUpdatedAt: string;
}

export interface AboutDTO {
  title: string;
  description: string;
  image: string;
  profileImage: string;
  experience: string;
  signature: string;
  skills: string[];
  features: string[];
  /** Set by the admin from the panel header; drives the Online/Offline badge in the About section. */
  online: boolean;
}

export interface SocialLinks {
  facebook: string;
  youtube: string;
  linkedin: string;
  github: string;
  x: string;
}

export interface UtilityLink {
  name: string;
  url: string;
}

export interface WebsiteSettingsDTO {
  siteName: string;
  tagline: string;
  logo: string;
  favicon: string;
  heroEyebrow: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  heroDescription: string;
  heroVideoUrl: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  whatsappNumber: string;
  /** Username (without @) or a t.me link. */
  telegramUsername: string;
  /** Links in the header's Add-On dropdown; empty hides the dropdown. */
  utilityLinks: UtilityLink[];
  /** How many BDT one USD is worth, used to fill in a server price given in only one currency. */
  usdToBdtRate: number;
  social: SocialLinks;
  footerText: string;
}

export interface ContactMessageDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface PexelsPhoto {
  id: number;
  url: string;
  thumb: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
}

/* ------------------------------------------------------------------ Tool Rent */

/**
 * submitting: balance taken, provider call in flight (or its outcome unknown).
 * pending / processing: accepted by the provider. completed: result delivered.
 * rejected: the provider refused it. failed: never reached the provider.
 * Rejected and failed orders are refunded.
 */
export const RENT_ORDER_STATUSES = ["submitting", "pending", "processing", "completed", "rejected", "failed"] as const;
export type RentOrderStatus = (typeof RENT_ORDER_STATUSES)[number];

export const BALANCE_TRANSACTION_TYPES = ["admin_credit", "admin_debit", "order", "refund", "deposit"] as const;
export type BalanceTransactionType = (typeof BALANCE_TRANSACTION_TYPES)[number];

export interface RentCustomFieldDTO {
  name: string;
  type: string;
  options: string[];
  required: boolean;
  imei?: boolean;
  /** A secret the customer types (e.g. a remote-access password): hidden once the order is finished. */
  sensitive?: boolean;
}

/** What visitors see: the selling price only, never the provider cost. */
/** Sections of the public rent page. */
export const RENT_CATEGORIES = ["rent", "imei", "server"] as const;
export type RentCategory = (typeof RENT_CATEGORIES)[number];
export const RENT_CATEGORY_LABELS: Record<RentCategory, string> = {
  rent: "Tools Rent",
  imei: "IMEI Service",
  server: "Server Service",
};

/** Icons an admin can pick for a service category (lucide icons, mapped in components/rent/categories.ts). */
export const CATEGORY_ICON_NAMES = [
  "key",
  "smartphone",
  "server",
  "globe",
  "monitor",
  "wifi",
  "cpu",
  "unlock",
  "shield",
  "wrench",
  "zap",
  "cloud",
] as const;
export type CategoryIconName = (typeof CATEGORY_ICON_NAMES)[number];

/**
 * A website service category. The three built-in ones (RENT_CATEGORIES) are
 * fixed because provider services are sorted into them automatically; the admin
 * can add more (e.g. "Remote Service") and put services in them by hand.
 */
export interface ServiceCategoryDTO {
  /** Database id; "" for a built-in category. */
  id: string;
  /** URL part: /services/<slug>. */
  slug: string;
  name: string;
  description: string;
  icon: CategoryIconName;
  builtIn: boolean;
  enabled: boolean;
  displayOrder: number;
}

export interface PublicRentServiceDTO {
  id: string;
  /** Category slug: one of RENT_CATEGORIES or an admin-made category. */
  category: string;
  /** The provider's service number, shown as "ID #1234". */
  code: number;
  icon: string;
  name: string;
  group: string;
  deliveryTime: string;
  info: string;
  /** Null when the admin shows prices to signed-in customers only and the visitor is signed out. */
  priceBdt: number | null;
  /** The public price, only present when this customer's personal rate is lower. */
  regularPriceBdt?: number;
  customFields: RentCustomFieldDTO[];
  minQuantity: number;
  maxQuantity: number;
  /** When the service was first added (ISO date); "" when unknown. */
  addedAt: string;
  /** Admin picks for the homepage Featured / Hot sections. */
  featured: boolean;
  hot: boolean;
}

export interface ProviderDTO {
  id: string;
  name: string;
  url: string;
  username: string;
  /** Last 4 characters of the API key only. */
  keyHint: string;
  enabled: boolean;
  displayOrder: number;
  /** API calls go through the fixed-IP proxy (PROVIDER_PROXY_URL). */
  useProxy: boolean;
  /** Currency the provider charges in; BDT costs are used as-is, USD costs × the USD rate. */
  currency: "USD" | "BDT";
  serviceCount: number;
  enabledServiceCount: number;
}

/** The newest order placed for a service, to spot services the provider refuses. */
export interface RentLastOrderDTO {
  status: RentOrderStatus;
  /** The provider's reason when it refused the order. */
  note: string;
  at: string;
}

export interface AdminRentServiceDTO {
  lastOrder: RentLastOrderDTO | null;
  id: string;
  /** "" for a custom (manual) service. */
  provider: string;
  /** A service the admin made and delivers by hand; no provider involved. */
  manual: boolean;
  minQuantity: number;
  maxQuantity: number;
  providerName: string;
  serviceId: number;
  name: string;
  title: string;
  group: string;
  type: string;
  /** Provider cost per unit, in `costCurrency` (the field name predates BDT providers). */
  costUsd: number;
  costCurrency: "USD" | "BDT";
  priceBdt: number | null;
  /** The price customers pay now, fixed or calculated. */
  effectivePriceBdt: number;
  deliveryTime: string;
  /** Provider's notes (admin reference only). */
  info: string;
  /** Admin-written text shown on the website. */
  description: string;
  icon: string;
  /** The admin's pick; "" means automatic. */
  category: string;
  /** Where it shows on the website now (the pick, or the detected category). */
  effectiveCategory: string;
  customFields: RentCustomFieldDTO[];
  enabled: boolean;
  featured: boolean;
  hot: boolean;
  availableOnProvider: boolean;
  displayOrder: number;
  syncedAt: string;
}

export interface RentConfigDTO {
  markupPercent: number;
  ordersEnabled: boolean;
  /** False: prices are shown to signed-in customers only. */
  pricesPublic: boolean;
}

/**
 * Display badge the admin gives a customer. Cosmetic only: no tag, not even
 * "VIP Admin", grants any admin access or changes prices.
 */
export const CUSTOMER_TAGS = ["customer", "reseller", "vip_admin", "web_owner", "founder_ceo"] as const;
export type CustomerTag = (typeof CUSTOMER_TAGS)[number];
export const CUSTOMER_TAG_LABELS: Record<CustomerTag, string> = {
  customer: "Customer",
  reseller: "Reseller",
  vip_admin: "VIP Admin",
  web_owner: "Web Owner",
  founder_ceo: "Founder CEO",
};

export interface CustomerDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  /** Missing on customers saved before tags existed (= "customer"). */
  tag?: CustomerTag;
  /** Profile picture URL uploaded by the customer; "" or missing = initial letter. */
  avatar?: string;
  balance: number;
  /** Personal rate vs the public price; missing on customers saved before it existed (= 0). */
  priceAdjustPercent?: number;
  active: boolean;
  createdAt: string;
}

export interface RentOrderDTO {
  id: string;
  serviceName: string;
  quantity: number;
  priceBdt: number;
  fields: Record<string, string>;
  status: RentOrderStatus;
  result: string;
  refunded: boolean;
  createdAt: string;
}

/** One order with its timeline, for the customer's order details page. */
export interface RentOrderDetailDTO extends RentOrderDTO {
  updatedAt: string;
  /** Status changes, oldest first. Orders from before history was kept get a best-effort timeline. */
  history: { status: RentOrderStatus; at: string }[];
}

/** A customer's order totals for the account dashboard. */
export interface RentOrderStatsDTO {
  total: number;
  /** Waiting at the provider (includes "confirming"). */
  pending: number;
  processing: number;
  completed: number;
  /** Rejected or failed; these are refunded. */
  cancelled: number;
  /** Taka held by orders that are still open. */
  lockedBdt: number;
  /** Taka spent on completed orders. */
  spentBdt: number;
}

export interface AdminRentOrderDTO extends RentOrderDTO {
  serviceId: number;
  /** Placed on a custom service: the admin delivers it by hand. */
  manual: boolean;
  providerName: string;
  costUsd: number;
  costCurrency: "USD" | "BDT";
  providerOrderId: string;
  adminNote: string;
  /** Why the last automatic status check failed; empty when it worked. */
  checkError: string;
  /** The status value the provider last sent, as-is. */
  providerStatus: string;
  lastCheckedAt: string | null;
  /** When the admin last changed the status or result by hand. */
  manualAt: string | null;
  customer: { id: string; name: string; email: string } | null;
}

/** Statuses the admin can set by hand. */
export const MANUAL_ORDER_STATUSES = ["pending", "processing", "completed", "rejected", "failed"] as const;
export type ManualOrderStatus = (typeof MANUAL_ORDER_STATUSES)[number];

export interface BalanceTransactionDTO {
  id: string;
  type: BalanceTransactionType;
  amount: number;
  balanceAfter: number;
  note: string;
  createdAt: string;
}
