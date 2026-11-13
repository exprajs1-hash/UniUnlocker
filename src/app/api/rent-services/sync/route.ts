import { adminRoute, ApiError, json } from "@/lib/api";
import { listProviderServices, ProviderRejectedError, ProviderUnavailableError } from "@/lib/gsm-api";
import { connectToDatabase } from "@/lib/mongodb";
import { RentService } from "@/models/RentService";

/**
 * Copies the provider's service list in. Cost, name, fields and delivery time
 * are refreshed; the admin's choices (enabled, title, fixed price, order) are kept.
 * New services start hidden. Services the provider dropped are marked unavailable.
 */
export const POST = adminRoute(async () => {
  let services;
  try {
    services = await listProviderServices();
  } catch (error) {
    if (error instanceof ProviderRejectedError || error instanceof ProviderUnavailableError) {
      throw new ApiError(502, `Sync failed: ${error.message}`);
    }
    throw error;
  }
  if (services.length === 0) throw new ApiError(502, "The provider returned no services. Nothing was changed.");

  await connectToDatabase();
  const syncedAt = new Date();
  const result = await RentService.bulkWrite(
    services.map((service) => ({
      updateOne: {
        filter: { serviceId: service.serviceId },
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
    { serviceId: { $nin: services.map((service) => service.serviceId) } },
    { $set: { availableOnProvider: false } },
  );

  return json({
    total: services.length,
    added: result.upsertedCount,
    unavailable: removed.modifiedCount,
  });
});
