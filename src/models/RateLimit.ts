import { Schema, model, models, type Model } from "mongoose";

export interface IRateLimit {
  key: string;
  count: number;
  expiresAt: Date;
}

// Stored in MongoDB so limits hold across serverless instances. The TTL index
// removes each window's counter once it has passed.
const RateLimitSchema = new Schema<IRateLimit>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 },
});

export const RateLimit: Model<IRateLimit> =
  models.RateLimit || model<IRateLimit>("RateLimit", RateLimitSchema);
