import { Schema, model, models, type Model } from "mongoose";

export interface ITool {
  name: string;
  logo: string;
  url: string;
  displayOrder: number;
  enabled: boolean;
}

const ToolSchema = new Schema<ITool>(
  {
    name: { type: String, required: true, trim: true },
    logo: { type: String, required: true },
    url: { type: String, default: "", trim: true },
    displayOrder: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Tool: Model<ITool> = models.Tool || model<ITool>("Tool", ToolSchema);
