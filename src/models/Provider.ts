import { Schema, model, models, type Model } from "mongoose";

/** A GSM-THEME / DHRU reseller API account that rent services are bought from. */
export interface IProvider {
  name: string;
  url: string;
  username: string;
  /** Encrypted with src/lib/secret-box.ts; never sent to the browser. */
  apiKeyEncrypted: string;
  /** A disabled provider's services are hidden and cannot be ordered. */
  enabled: boolean;
  displayOrder: number;
  /** Route API calls through PROVIDER_PROXY_URL, for providers that only allow whitelisted IPs. */
  useProxy: boolean;
}

const ProviderSchema = new Schema<IProvider>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    username: { type: String, required: true, trim: true },
    apiKeyEncrypted: { type: String, required: true, select: false },
    enabled: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    useProxy: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Provider: Model<IProvider> = models.Provider || model<IProvider>("Provider", ProviderSchema);
