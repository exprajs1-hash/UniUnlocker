import { Schema, model, models, type Model } from "mongoose";

export interface IPartner {
  name: string;
  logo: string;
  url: string;
  displayOrder: number;
  enabled: boolean;
}

const PartnerSchema = new Schema<IPartner>(
  {
    name: { type: String, required: true, trim: true },
    logo: { type: String, required: true },
    url: { type: String, default: "", trim: true },
    displayOrder: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Partner: Model<IPartner> =
  models.Partner || model<IPartner>("Partner", PartnerSchema);
