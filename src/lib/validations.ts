import { z } from "zod";
import { isUsableImageUrl } from "@/lib/images";
import { DEFAULT_USD_TO_BDT } from "@/lib/pricing";
import { SERVICE_ICON_NAMES } from "@/lib/service-icons";
import { PROJECT_STATUSES, SERVER_STATUSES } from "@/types";

const text = (max: number, label: string) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const optionalText = (max: number) =>
  z.string().trim().max(max, "This value is too long").default("");

/** Blank, or an http(s) URL. Rejects schemes like javascript: that would run when clicked. */
const optionalUrl = z
  .string()
  .trim()
  .max(500, "This URL is too long")
  .refine((value) => {
    if (!value) return true;
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Enter a full URL starting with https://")
  .default("");

/** Limited to hosts next/image is configured for, since others would break rendering. */
const imageUrl = z
  .string()
  .trim()
  .max(500, "This URL is too long")
  .refine(
    (value) => !value || isUsableImageUrl(value),
    "Upload an image, or paste an image link starting with https://",
  )
  .default("");

const displayOrder = z.coerce.number().int().min(0).max(100000).default(0);

/** Blank means "no price"; otherwise a non-negative amount. */
const optionalPrice = z
  .preprocess(
    (value) => {
      if (value === undefined || value === null) return null;
      if (typeof value === "string") return value.trim() === "" ? null : Number(value.trim());
      return value;
    },
    z.number({ error: "Enter a number, or leave it blank" }).min(0, "Price cannot be negative").max(100_000_000, "This price is too large").nullable(),
  )
  .default(null);

const phone = (message: string) =>
  z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{7,20}$/, message)
    .or(z.literal(""))
    .default("");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(200).pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Password is required").max(200),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(200),
    newPassword: z
      .string()
      .min(12, "Use at least 12 characters")
      // bcrypt ignores everything after 72 bytes, so a longer password would be silently cut.
      .refine((value) => new TextEncoder().encode(value).length <= 72, "Use at most 72 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords do not match",
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    error: "Choose a password different from your current one",
  });

export const projectSchema = z.object({
  title: text(120, "Title"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(100, "Slug is too long")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens")
    .or(z.literal(""))
    .default(""),
  shortDescription: text(240, "Short description"),
  description: optionalText(10000),
  category: text(60, "Category"),
  image: imageUrl,
  projectUrl: optionalUrl,
  featured: z.boolean().default(false),
  status: z.enum(PROJECT_STATUSES).default("draft"),
  displayOrder,
});

export const projectPatchSchema = z
  .object({ featured: z.boolean(), status: z.enum(PROJECT_STATUSES) })
  .partial();

export const serviceSchema = z.object({
  title: text(80, "Title"),
  description: optionalText(400),
  icon: z.enum(SERVICE_ICON_NAMES).default("Wrench"),
  displayOrder,
  enabled: z.boolean().default(true),
});

export const servicePatchSchema = z.object({ enabled: z.boolean() }).partial();

export const partnerSchema = z.object({
  name: text(60, "Name"),
  logo: imageUrl.refine((value) => value.length > 0, "Add a logo"),
  url: optionalUrl,
  displayOrder,
  enabled: z.boolean().default(true),
});

export const partnerPatchSchema = z.object({ enabled: z.boolean() }).partial();

export const toolSchema = partnerSchema;

export const toolPatchSchema = partnerPatchSchema;

export const serverSchema = z.object({
  name: text(60, "Name"),
  description: optionalText(300),
  logo: imageUrl,
  priceBdt: optionalPrice,
  priceUsd: optionalPrice,
  status: z.enum(SERVER_STATUSES).default("online"),
  enabled: z.boolean().default(true),
  displayOrder,
});

export const serverPatchSchema = z
  .object({ status: z.enum(SERVER_STATUSES), enabled: z.boolean() })
  .partial();

export const aboutSchema = z.object({
  title: text(80, "Title"),
  description: text(2000, "Description"),
  image: imageUrl,
  profileImage: imageUrl,
  experience: optionalText(120),
  signature: optionalText(40),
  skills: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  features: z.array(z.string().trim().min(1).max(100)).max(12).default([]),
});

/** Separate from aboutSchema, so saving the About form cannot overwrite the live status. */
export const aboutPatchSchema = z.object({ online: z.boolean() });

export const settingsSchema = z.object({
  siteName: text(60, "Website name"),
  tagline: optionalText(60),
  logo: imageUrl,
  favicon: imageUrl,
  heroEyebrow: optionalText(80),
  heroTitle: text(80, "Hero title"),
  heroHighlight: optionalText(80),
  heroSubtitle: optionalText(120),
  heroDescription: optionalText(400),
  heroVideoUrl: optionalUrl,
  contactEmail: z
    .string()
    .trim()
    .pipe(z.email("Enter a valid email address"))
    .or(z.literal(""))
    .default(""),
  contactPhone: optionalText(40),
  contactAddress: optionalText(200),
  whatsappNumber: phone("Use the international format, e.g. +8801700000000"),
  telegramUsername: z
    .string()
    .trim()
    .transform((value) => value.replace(/^(?:https?:\/\/)?(?:t\.me|telegram\.me)\//i, "").replace(/^@/, ""))
    .pipe(z.string().regex(/^(?:[A-Za-z0-9_]{4,32})?$/, "Enter a Telegram username like uniunlocker, or a t.me link"))
    .default(""),
  utilityLinks: z
    .array(
      z.object({
        name: text(40, "Name"),
        url: optionalUrl.refine((value) => value.length > 0, "Add a link"),
      }),
    )
    .max(20, "Add at most 20 links")
    .default([]),
  usdToBdtRate: z.coerce
    .number({ error: "Enter a number, e.g. 130" })
    .gt(0, "The rate must be more than 0")
    .max(100_000, "This rate is too large")
    .default(DEFAULT_USD_TO_BDT),
  social: z.object({
    facebook: optionalUrl,
    youtube: optionalUrl,
    linkedin: optionalUrl,
    github: optionalUrl,
    x: optionalUrl,
  }),
  footerText: optionalText(200),
});

export const contactSchema = z.object({
  name: text(100, "Name"),
  email: z.string().trim().max(200).pipe(z.email("Enter a valid email address")),
  phone: phone("Enter a valid phone number"),
  subject: text(150, "Subject"),
  message: z
    .string()
    .trim()
    .min(10, "Message should be at least 10 characters")
    .max(5000, "Message is too long"),
  // Honeypot: hidden from people, so only bots fill it in.
  website: z.string().max(200).default(""),
});

export const messagePatchSchema = z.object({ read: z.boolean() });

export const reorderSchema = z.object({
  ids: z
    .array(z.string().regex(/^[a-f\d]{24}$/i))
    .min(1)
    .max(500),
});

/* ------------------------------------------------------------------ Tool Rent */

const customerPassword = z
  .string()
  .min(8, "Use at least 8 characters")
  // bcrypt ignores everything after 72 bytes, so a longer password would be silently cut.
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Use at most 72 characters");

export const customerRegisterSchema = z
  .object({
    name: text(80, "Name"),
    email: z.string().trim().toLowerCase().max(200).pipe(z.email("Enter a valid email address")),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid phone number, e.g. 01700000000"),
    password: customerPassword,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords do not match",
  });

export const customerLoginSchema = loginSchema;

export const balanceAdjustSchema = z.object({
  amount: z.coerce
    .number({ error: "Enter an amount" })
    .int("Use a whole number of taka")
    .refine((value) => value !== 0, "The amount cannot be 0")
    .refine((value) => Math.abs(value) <= 10_000_000, "This amount is too large"),
  note: optionalText(200),
});

export const customerPatchSchema = z.object({ active: z.boolean() });

/** Every key is optional with no defaults, so a PATCH only touches what it sends. */
export const rentServicePatchSchema = z.object({
  enabled: z.boolean().optional(),
  title: z.string().trim().max(200, "This value is too long").optional(),
  priceBdt: z
    .preprocess(
      (value) => (typeof value === "string" ? (value.trim() === "" ? null : Number(value.trim())) : value),
      z
        .number({ error: "Enter a number, or leave it blank" })
        .int("Use a whole number of taka")
        .min(0, "Price cannot be negative")
        .max(10_000_000, "This price is too large")
        .nullable(),
    )
    .optional(),
  displayOrder: z.coerce.number().int().min(0).max(100000).optional(),
});

export const rentConfigSchema = z.object({
  markupPercent: z.coerce
    .number({ error: "Enter a percentage, e.g. 20" })
    .min(0, "Markup cannot be negative")
    .max(1000, "This markup is too large"),
  ordersEnabled: z.boolean(),
});

export const rentOrderSchema = z.object({
  serviceId: z.string().regex(/^[a-f\d]{24}$/i, "Choose a service"),
  fields: z.record(z.string(), z.string().max(1000)).default({}),
});
