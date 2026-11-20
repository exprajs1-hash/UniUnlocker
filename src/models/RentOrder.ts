import { Schema, Types, model, models, type Model } from "mongoose";
import { RENT_ORDER_STATUSES, type RentOrderStatus } from "@/types";

export interface IRentOrder {
  customer: Types.ObjectId;
  /** The provider the order was placed with, used for status checks; null for a custom service. */
  provider: Types.ObjectId | null;
  /** Placed on a custom service: the admin delivers it by hand. */
  manual: boolean;
  /** Fields hidden ("••••") once the order is finished, e.g. a remote-access password. */
  sensitiveFields: string[];
  /** The last status the customer was emailed about, so each email goes out once. */
  notifiedStatus: string;
  /** Snapshot at order time, so later price or name edits do not change history. */
  serviceId: number;
  serviceName: string;
  quantity: number;
  /** Total charged: unit price × quantity. */
  priceBdt: number;
  /** Provider cost, in `costCurrency`. */
  costUsd: number;
  costCurrency: "USD" | "BDT";
  fields: Record<string, string>;
  status: RentOrderStatus;
  providerOrderId: string;
  /** What the provider delivered (login, code) or why it rejected the order. */
  result: string;
  adminNote: string;
  refunded: boolean;
  lastCheckedAt: Date | null;
  /** Why the last automatic status check failed; empty when it worked. */
  checkError: string;
  /** The status value the provider last sent, as-is (e.g. "4"). */
  providerStatus: string;
  /** The provider's last status reply as JSON, for the admin to see exactly what it sent. */
  providerReply: string;
  /** Set when the admin changed the status or result by hand. */
  manualAt: Date | null;
  /** Each status the order went through and when, for the customer's order timeline. */
  statusHistory: { status: RentOrderStatus; at: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const RentOrderSchema = new Schema<IRentOrder>(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    provider: { type: Schema.Types.ObjectId, ref: "Provider", default: null },
    manual: { type: Boolean, default: false },
    sensitiveFields: { type: [String], default: [] },
    notifiedStatus: { type: String, default: "" },
    serviceId: { type: Number, required: true },
    serviceName: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    priceBdt: { type: Number, required: true },
    costUsd: { type: Number, default: 0 },
    costCurrency: { type: String, enum: ["USD", "BDT"], default: "USD" },
    fields: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: RENT_ORDER_STATUSES, default: "submitting", index: true },
    providerOrderId: { type: String, default: "" },
    result: { type: String, default: "" },
    /** Provider error details for the admin; never shown to the customer. */
    adminNote: { type: String, default: "" },
    refunded: { type: Boolean, default: false },
    lastCheckedAt: { type: Date, default: null },
    checkError: { type: String, default: "" },
    providerStatus: { type: String, default: "" },
    providerReply: { type: String, default: "" },
    manualAt: { type: Date, default: null },
    statusHistory: {
      type: [{ _id: false, status: { type: String, enum: RENT_ORDER_STATUSES }, at: Date }],
      default: [],
    },
  },
  { timestamps: true, minimize: false },
);

RentOrderSchema.index({ customer: 1, createdAt: -1 });

export const RentOrder: Model<IRentOrder> = models.RentOrder || model<IRentOrder>("RentOrder", RentOrderSchema);
