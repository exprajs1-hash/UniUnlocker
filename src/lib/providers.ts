import "server-only";
import { Types } from "mongoose";
import { ApiError } from "@/lib/api";
import { listProviderServices, ProviderRejectedError, ProviderUnavailableError, type ProviderCredentials } from "@/lib/gsm-api";
import { connectToDatabase } from "@/lib/mongodb";
import { decryptSecret, encryptSecret } from "@/lib/secret-box";
import { Provider, type IProvider } from "@/models/Provider";
import { RentConfig } from "@/models/RentConfig";
import { RentOrder } from "@/models/RentOrder";
import { RentService } from "@/models/RentService";
import type { ProviderDTO } from "@/types";

type ProviderDoc = IProvider & { _id: unknown };

export function credentialsOf(doc: Pick<IProvider, "url" | "username" | "apiKeyEncrypted">): ProviderCredentials {
  const key = doc.apiKeyEncrypted ? decryptSecret(doc.apiKeyEncrypted) : null;
  if (doc.apiKeyEncrypted && !key) {
    console.error("[rent] A provider API key could not be decrypted; re-enter it in the admin panel.");
  }
  return { url: doc.url, username: doc.username, key: key ?? "" };
}

/** Loads one provider's credentials. Throws a 404/503 ApiError when it cannot be used. */
export async function getProviderCredentials(id: Types.ObjectId | string, requireEnabled = false): Promise<ProviderCredentials> {
  await migrateLegacyProvider();
  const doc = await Provider.findById(id).select("+apiKeyEncrypted").lean();
  if (!doc) throw new ApiError(404, "Provider not found.");
  if (requireEnabled && !doc.enabled) throw new ApiError(503, "This service is not available right now.");
  return credentialsOf(doc);
}

export function toProviderDTO(doc: ProviderDoc, counts?: { services: number; enabled: number }): ProviderDTO {
  const key = doc.apiKeyEncrypted ? decryptSecret(doc.apiKeyEncrypted) : null;
  return {
    id: String(doc._id),
    name: doc.name,
    url: doc.url,
    username: doc.username,
    keyHint: key ? `••••${key.slice(-4)}` : doc.apiKeyEncrypted ? "unreadable – re-enter" : "",
    enabled: doc.enabled,
    displayOrder: doc.displayOrder,
    serviceCount: counts?.services ?? 0,
    enabledServiceCount: counts?.enabled ?? 0,
  };
}

/* --------------------------------------------------------------- migration */

let migration: Promise<void> | null = null;

/**
 * Before multi-provider support there was a single connection (admin panel
 * settings or GSM_API_* env vars) and services/orders had no provider. The
 * first time providers are needed, that connection becomes "Default provider"
 * and existing services/orders are attached to it. Runs once per process.
 */
export function migrateLegacyProvider(): Promise<void> {
  migration ??= runMigration().catch((error) => {
    migration = null;
    throw error;
  });
  return migration;
}

async function runMigration(): Promise<void> {
  await connectToDatabase();

  // The old unique index on serviceId alone would block the same id at two providers.
  const indexes = await RentService.collection.indexes().catch(() => []);
  if (indexes.some((index) => index.name === "serviceId_1")) {
    await RentService.collection.dropIndex("serviceId_1");
  }
  await RentService.syncIndexes();

  const orphans =
    (await RentService.exists({ provider: { $exists: false } })) || (await RentOrder.exists({ provider: { $exists: false } }));
  if (!orphans && (await Provider.exists({}))) return;

  let provider = await Provider.findOne({}).sort({ createdAt: 1 }).lean();
  if (!provider) {
    const legacy = await RentConfig.findOne({ key: "singleton" }).select("+apiKeyEncrypted").lean();
    const url = legacy?.apiUrl || process.env.GSM_API_URL || "";
    const username = legacy?.apiUsername || process.env.GSM_API_USERNAME || "";
    let apiKeyEncrypted = legacy?.apiKeyEncrypted || "";
    if (!apiKeyEncrypted && process.env.GSM_API_KEY) {
      apiKeyEncrypted = encryptSecret(process.env.GSM_API_KEY);
    }
    if (!url || !username || !apiKeyEncrypted) return; // Nothing to migrate; the admin adds providers.
    const created = await Provider.create({ name: "Default provider", url, username, apiKeyEncrypted });
    provider = created.toObject();
    console.log("[rent] Created \"Default provider\" from the previous API connection.");
  }

  await RentService.updateMany({ provider: { $exists: false } }, { $set: { provider: provider._id } });
  await RentOrder.updateMany({ provider: { $exists: false } }, { $set: { provider: provider._id } });
}

/* -------------------------------------------------------------------- sync */

export interface SyncResult {
  total: number;
  added: number;
  unavailable: number;
}

/**
 * Copies one provider's service list in. Cost, name, fields and delivery time
 * are refreshed; the admin's choices (enabled, title, fixed price, order) are
 * kept. New services start hidden; ones the provider dropped are marked unavailable.
 */
export async function syncProvider(providerId: string): Promise<SyncResult> {
  const credentials = await getProviderCredentials(providerId);
  let services;
  try {
    services = await listProviderServices(credentials);
  } catch (error) {
    if (error instanceof ProviderRejectedError || error instanceof ProviderUnavailableError) {
      throw new ApiError(502, `Sync failed: ${error.message}`);
    }
    throw error;
  }
  if (services.length === 0) throw new ApiError(502, "The provider returned no services. Nothing was changed.");

  const provider = new Types.ObjectId(providerId);
  const syncedAt = new Date();
  const result = await RentService.bulkWrite(
    services.map((service) => ({
      updateOne: {
        filter: { provider, serviceId: service.serviceId },
        update: {
          $set: {
            name: service.name,
            group: service.group,
            type: service.type,
            costUsd: service.costUsd,
            deliveryTime: service.deliveryTime,
            info: service.info,
            customFields: service.customFields,
            availableOnProvider: true,
            syncedAt,
          },
        },
        upsert: true,
      },
    })),
  );
  const removed = await RentService.updateMany(
    { provider, serviceId: { $nin: services.map((service) => service.serviceId) } },
    { $set: { availableOnProvider: false } },
  );
  return { total: services.length, added: result.upsertedCount, unavailable: removed.modifiedCount };
}

/** Ids of providers whose services may be shown and ordered. */
export async function enabledProviderIds(): Promise<Types.ObjectId[]> {
  await migrateLegacyProvider();
  const providers = await Provider.find({ enabled: true }, { _id: 1 }).lean();
  return providers.map((provider) => provider._id as Types.ObjectId);
}
