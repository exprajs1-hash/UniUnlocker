import { Schema, Types, model, models, type Model } from "mongoose";

export interface IRentCustomField {
  name: string;
  type: string;
  options: string[];
  required: boolean;
}

/** A provider service, copied in by "Sync from provider". Hidden until the admin enables it. */
export interface IRentService {
  /** Which provider sells this service. */
  provider: Types.ObjectId;
  /** The provider's own service id; unique only within one provider. */
  serviceId: number;
  /** Name from the provider; `title` overrides it on the website when set. */
  name: string;
  title: string;
  group: string;
  type: string;
  /** What the provider charges us, in USD. */
  costUsd: number;
  /** Fixed selling price in BDT; null means "cost × rate + markup". */
  priceBdt: number | null;
  deliveryTime: string;
  info: string;
  customFields: IRentCustomField[];
  enabled: boolean;
  /** False when the last sync no longer listed this service. */
  availableOnProvider: boolean;
  displayOrder: number;
  syncedAt: Date;
}

const RentServiceSchema = new Schema<IRentService>(
  {
    provider: { type: Schema.Types.ObjectId, ref: "Provider", required: true },
    serviceId: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    title: { type: String, default: "", trim: true },
    group: { type: String, default: "", trim: true },
    type: { type: String, default: "" },
    costUsd: { type: Number, default: 0 },
    priceBdt: { type: Number, default: null },
    deliveryTime: { type: String, default: "" },
    info: { type: String, default: "" },
    // `type` is wrapped because a bare `type` key would be read as the subdocument's own schema type.
    customFields: [
      {
        _id: false,
        name: String,
        type: { type: String },
        options: [String],
        required: Boolean,
      },
    ],
    enabled: { type: Boolean, default: false },
    availableOnProvider: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    syncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

RentServiceSchema.index({ provider: 1, serviceId: 1 }, { unique: true });
RentServiceSchema.index({ enabled: 1, displayOrder: 1 });

export const RentService: Model<IRentService> =
  models.RentService || model<IRentService>("RentService", RentServiceSchema);
