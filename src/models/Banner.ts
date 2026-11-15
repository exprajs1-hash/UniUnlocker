import { Schema, model, models, type Model } from "mongoose";

/** A slide in the home page banner slider. The slider only shows when at least one is enabled. */
export interface IBanner {
  image: string;
  /** Optional text over the image; blank shows the image alone. */
  title: string;
  subtitle: string;
  /** Optional link; with a button label it shows a button, otherwise the whole slide is the link. */
  url: string;
  buttonLabel: string;
  displayOrder: number;
  enabled: boolean;
}

const BannerSchema = new Schema<IBanner>(
  {
    image: { type: String, required: true },
    title: { type: String, default: "", trim: true },
    subtitle: { type: String, default: "", trim: true },
    url: { type: String, default: "", trim: true },
    buttonLabel: { type: String, default: "", trim: true },
    displayOrder: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Banner: Model<IBanner> = models.Banner || model<IBanner>("Banner", BannerSchema);
