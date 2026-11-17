import { Schema, model, models, type Model } from "mongoose";
import { CATEGORY_ICON_NAMES, type CategoryIconName } from "@/types";

/** A service category made by the admin, e.g. "Remote Service". The three built-in ones live in code. */
export interface IServiceCategory {
  /** URL part: /services/<slug>. Fixed after creation so shared links keep working. */
  slug: string;
  name: string;
  description: string;
  icon: CategoryIconName;
  /** A hidden category has no page or menu entry. */
  enabled: boolean;
  displayOrder: number;
}

const ServiceCategorySchema = new Schema<IServiceCategory>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    icon: { type: String, enum: CATEGORY_ICON_NAMES, default: "globe" },
    enabled: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const ServiceCategory: Model<IServiceCategory> =
  models.ServiceCategory || model<IServiceCategory>("ServiceCategory", ServiceCategorySchema);
