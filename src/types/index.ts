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

export const BALANCE_TRANSACTION_TYPES = ["admin_credit", "admin_debit", "order", "refund"] as const;
export type BalanceTransactionType = (typeof BALANCE_TRANSACTION_TYPES)[number];

export interface RentCustomFieldDTO {
  name: string;
  type: string;
  options: string[];
  required: boolean;
}

/** What visitors see: the selling price only, never the provider cost. */
export interface PublicRentServiceDTO {
  id: string;
  name: string;
  group: string;
  deliveryTime: string;
  info: string;
  priceBdt: number;
  customFields: RentCustomFieldDTO[];
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
  serviceCount: number;
  enabledServiceCount: number;
}

export interface AdminRentServiceDTO {
  id: string;
  provider: string;
  providerName: string;
  serviceId: number;
  name: string;
  title: string;
  group: string;
  type: string;
  costUsd: number;
  priceBdt: number | null;
  /** The price customers pay now, fixed or calculated. */
  effectivePriceBdt: number;
  deliveryTime: string;
  info: string;
  customFields: RentCustomFieldDTO[];
  enabled: boolean;
  availableOnProvider: boolean;
  displayOrder: number;
  syncedAt: string;
}

export interface RentConfigDTO {
  markupPercent: number;
  ordersEnabled: boolean;
}

export interface CustomerDTO {
  id: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
  active: boolean;
  createdAt: string;
}

export interface RentOrderDTO {
  id: string;
  serviceName: string;
  priceBdt: number;
  fields: Record<string, string>;
  status: RentOrderStatus;
  result: string;
  refunded: boolean;
  createdAt: string;
}

export interface AdminRentOrderDTO extends RentOrderDTO {
  serviceId: number;
  providerName: string;
  costUsd: number;
  providerOrderId: string;
  adminNote: string;
  customer: { id: string; name: string; email: string } | null;
}

export interface BalanceTransactionDTO {
  id: string;
  type: BalanceTransactionType;
  amount: number;
  balanceAfter: number;
  note: string;
  createdAt: string;
}
