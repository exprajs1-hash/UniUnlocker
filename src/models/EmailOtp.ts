import { Schema, model, models, type Model } from "mongoose";

export type OtpPurpose = "register" | "reset";

/**
 * A one-time email code. For sign-up it also holds the pending account, which
 * is only created once the code is confirmed. The TTL index deletes it on expiry.
 */
export interface IEmailOtp {
  email: string;
  purpose: OtpPurpose;
  /** HMAC of the code; the code itself is never stored. */
  codeHash: string;
  /** Wrong codes entered; the code stops working after too many. */
  attempts: number;
  /** Sign-up only: the details to create the account with. */
  pending: { name: string; phone: string; passwordHash: string } | null;
  sentAt: Date;
  expiresAt: Date;
}

const PendingSchema = new Schema<NonNullable<IEmailOtp["pending"]>>(
  { name: String, phone: String, passwordHash: String },
  { _id: false },
);

const EmailOtpSchema = new Schema<IEmailOtp>({
  email: { type: String, required: true, lowercase: true, trim: true },
  purpose: { type: String, enum: ["register", "reset"], required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  pending: { type: PendingSchema, default: null },
  sentAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});
EmailOtpSchema.index({ email: 1, purpose: 1 }, { unique: true });

export const EmailOtp: Model<IEmailOtp> = models.EmailOtp || model<IEmailOtp>("EmailOtp", EmailOtpSchema);
