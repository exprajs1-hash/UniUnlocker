import { Schema, Types, model, models, type Model } from "mongoose";
import { RENT_ORDER_STATUSES, type RentOrderStatus } from "@/types";

export interface IRentOrder {
  customer: Types.ObjectId;
  /** The provider the order was placed with, used for status checks. */
  provider: Types.ObjectId;
  /** Snapshot at order time, so later price or name edits do not change history. */
  serviceId: number;
  serviceName: string;
  priceBdt: number;
  costUsd: number;
  fields: Record<string, string>;
  status: RentOrderStatus;
  providerOrderId: string;
  /** What the provider delivered (login, code) or why it rejected the order. */
  result: string;
  adminNote: string;
  refunded: boolean;
  lastCheckedAt: Date | null;
  createdAt: Date;
}

const RentOrderSchema = new Schema<IRentOrder>(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    provider: { type: Schema.Types.ObjectId, ref: "Provider", required: true },
    serviceId: { type: Number, required: true },
    serviceName: { type: String, required: true },
    priceBdt: { type: Number, required: true },
    costUsd: { type: Number, default: 0 },
    fields: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: RENT_ORDER_STATUSES, default: "submitting", index: true },
    providerOrderId: { type: String, default: "" },
    result: { type: String, default: "" },
    /** Provider error details for the admin; never shown to the customer. */
    adminNote: { type: String, default: "" },
    refunded: { type: Boolean, default: false },
    lastCheckedAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false },
);

RentOrderSchema.index({ customer: 1, createdAt: -1 });

export const RentOrder: Model<IRentOrder> = models.RentOrder || model<IRentOrder>("RentOrder", RentOrderSchema);
