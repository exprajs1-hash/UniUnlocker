import { Schema, Types, model, models, type Model } from "mongoose";

export const DEPOSIT_STATUSES = ["pending", "completed", "failed"] as const;
export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

/** One "Add balance" payment through ZiniPay. Credited to the wallet once, when ZiniPay confirms it. */
export interface IDeposit {
  customer: Types.ObjectId;
  /** BDT the customer asked to add, and what is credited. */
  amount: number;
  status: DepositStatus;
  /** Set when ZiniPay confirms; unique, so one paid invoice can never credit twice. */
  invoiceId: string | null;
  transactionId: string;
  method: string;
  createdAt: Date;
}

const DepositSchema = new Schema<IDeposit>(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: DEPOSIT_STATUSES, default: "pending" },
    invoiceId: { type: String, default: null },
    transactionId: { type: String, default: "" },
    method: { type: String, default: "" },
  },
  { timestamps: true },
);

DepositSchema.index({ invoiceId: 1 }, { unique: true, partialFilterExpression: { invoiceId: { $type: "string" } } });
DepositSchema.index({ customer: 1, createdAt: -1 });

export const Deposit: Model<IDeposit> = models.Deposit || model<IDeposit>("Deposit", DepositSchema);
