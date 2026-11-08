import { Schema, model, models, type Model } from "mongoose";
import type { WebsiteSettingsDTO } from "@/types";

export type IWebsiteSettings = WebsiteSettingsDTO & { key: string };

const WebsiteSettingsSchema = new Schema<IWebsiteSettings>(
  {
    key: { type: String, default: "singleton", unique: true },
    siteName: String,
    tagline: String,
    logo: String,
    favicon: String,
    heroEyebrow: String,
    heroTitle: String,
    heroHighlight: String,
    heroSubtitle: String,
    heroDescription: String,
    heroVideoUrl: String,
    contactEmail: String,
    contactPhone: String,
    contactAddress: String,
    whatsappNumber: String,
    telegramUsername: String,
    driverUrl: String,
    usdToBdtRate: Number,
    social: {
      facebook: String,
      youtube: String,
      linkedin: String,
      github: String,
      x: String,
    },
    footerText: String,
  },
  { timestamps: true },
);

export const WebsiteSettings: Model<IWebsiteSettings> =
  models.WebsiteSettings || model<IWebsiteSettings>("WebsiteSettings", WebsiteSettingsSchema);
