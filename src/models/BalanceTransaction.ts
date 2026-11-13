import { Schema, Types, model, models, type Model } from "mongoose";
import { BALANCE_TRANSACTION_TYPES, type BalanceTransactionType } from "@/types";

/** One line in a customer's wallet history. `amount` is signed: + adds, − deducts. */
export interface IBalanceTransaction {
  customer: Types.ObjectId;
  type: BalanceTransactionType;
  amount: number;
  balanceAfter: number;
  note: string;
  order: Types.ObjectId | null;
  createdAt: Date;
}

const BalanceTransactionSchema = new Schema<IBalanceTransaction>(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    type: { type: String, enum: BALANCE_TRANSACTION_TYPES, required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    note: { type: String, default: "" },
    order: { type: Schema.Types.ObjectId, ref: "RentOrder", default: null },
  },
  { timestamps: true },
);

BalanceTransactionSchema.index({ customer: 1, createdAt: -1 });

export const BalanceTransaction: Model<IBalanceTransaction> =
  models.BalanceTransaction || model<IBalanceTransaction>("BalanceTransaction", BalanceTransactionSchema);
