import { Schema, Types, model, models, type Model } from "mongoose";

export interface IRentCustomField {
  name: string;
  type: string;
  options: string[];
  required: boolean;
  /** Sent to the provider as the IMEI, not as a custom field. */
  imei?: boolean;
  /** A secret (e.g. remote-access password): hidden in the order once it is finished. */
  sensitive?: boolean;
}

/** A provider service, copied in by "Sync from provider". Hidden until the admin enables it. */
export interface IRentService {
  /** Which provider sells this service; null for a custom (manual) service. */
  provider: Types.ObjectId | null;
  /** Made by the admin and delivered by hand: orders wait for the admin instead of going to a provider. */
  manual: boolean;
  /** The provider's own service id; unique only within one provider. */
  serviceId: number;
  /** Name from the provider; `title` overrides it on the website when set. */
  name: string;
  title: string;
  group: string;
  type: string;
  /** What the provider charges us, in `costCurrency` (the name predates BDT providers). */
  costUsd: number;
  /** Copied from the provider: a BDT cost is not multiplied by the USD rate. */
  costCurrency: "USD" | "BDT";
  /** Fixed selling price in BDT; null means "cost × rate + markup". */
  priceBdt: number | null;
  deliveryTime: string;
  /** The provider's own notes; admin reference only, never shown on the website. */
  info: string;
  /** Written by the admin and shown to customers. Sync never changes it. */
  description: string;
  /** Tool logo/icon image set by the admin; shown in the catalog and on the details page. */
  icon: string;
  /** Website section: "rent", "imei" or "server"; "" means detect from the provider type and name. */
  category: string;
  customFields: IRentCustomField[];
  /** Quantity a customer may order, from the provider. 1–1 for services not sold by quantity. */
  minQuantity: number;
  maxQuantity: number;
  enabled: boolean;
  /** Admin pick: shown in the homepage "Featured Products" section. */
  featured: boolean;
  /** Admin pick: an offer, shown in the homepage "Hot Products" section. */
  hot: boolean;
  /** False when the last sync no longer listed this service. */
  availableOnProvider: boolean;
  displayOrder: number;
  syncedAt: Date;
}

const RentServiceSchema = new Schema<IRentService>(
  {
    provider: { type: Schema.Types.ObjectId, ref: "Provider", default: null },
    manual: { type: Boolean, default: false },
    serviceId: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    title: { type: String, default: "", trim: true },
    group: { type: String, default: "", trim: true },
    type: { type: String, default: "" },
    costUsd: { type: Number, default: 0 },
    costCurrency: { type: String, enum: ["USD", "BDT"], default: "USD" },
    priceBdt: { type: Number, default: null },
    deliveryTime: { type: String, default: "" },
    info: { type: String, default: "" },
    description: { type: String, default: "", trim: true },
    icon: { type: String, default: "", trim: true },
    category: { type: String, enum: ["", "rent", "imei", "server"], default: "" },
    // `type` is wrapped because a bare `type` key would be read as the subdocument's own schema type.
    customFields: [
      {
        _id: false,
        name: String,
        type: { type: String },
        options: [String],
        required: Boolean,
        imei: { type: Boolean, default: false },
        sensitive: { type: Boolean, default: false },
      },
    ],
    minQuantity: { type: Number, default: 1 },
    maxQuantity: { type: Number, default: 1 },
    enabled: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    hot: { type: Boolean, default: false },
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
