import { Schema, model, models, type Model } from "mongoose";

export interface IService {
  title: string;
  description: string;
  icon: string;
  displayOrder: number;
  enabled: boolean;
}

const ServiceSchema = new Schema<IService>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    icon: { type: String, default: "Wrench" },
    displayOrder: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Service: Model<IService> =
  models.Service || model<IService>("Service", ServiceSchema);
