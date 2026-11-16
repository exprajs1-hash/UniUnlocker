import { Schema, model, models, type Model } from "mongoose";

/** A website visitor who registered to rent tools. Separate from Admin. */
export interface ICustomer {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  /** Wallet balance in whole BDT. Only changed with atomic $inc updates. */
  balance: number;
  /**
   * This customer's rate against the public price, in percent: -10 is 10% cheaper,
   * 5 is 5% dearer, 0 is the public price. Set by the admin; never shown to the customer.
   */
  priceAdjustPercent: number;
  /** A blocked customer cannot sign in or order. */
  active: boolean;
  /** Bumped to sign the customer out everywhere. */
  tokenVersion: number;
  createdAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true },
    passwordHash: { type: String, required: true, select: false },
    balance: { type: Number, default: 0, min: 0 },
    priceAdjustPercent: { type: Number, default: 0, min: -90, max: 500 },
    active: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Customer: Model<ICustomer> = models.Customer || model<ICustomer>("Customer", CustomerSchema);
