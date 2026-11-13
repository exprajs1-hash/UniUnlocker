import { Schema, model, models, type Model } from "mongoose";

/** Singleton with the Tool Rent pricing and on/off switch. */
export interface IRentConfig {
  key: string;
  /** Added on top of cost × USD rate for services without a fixed BDT price. */
  markupPercent: number;
  /** Lets the admin pause new orders without hiding the services. */
  ordersEnabled: boolean;
}

const RentConfigSchema = new Schema<IRentConfig>(
  {
    key: { type: String, default: "singleton", unique: true },
    markupPercent: { type: Number, default: 20 },
    ordersEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const RentConfig: Model<IRentConfig> = models.RentConfig || model<IRentConfig>("RentConfig", RentConfigSchema);
