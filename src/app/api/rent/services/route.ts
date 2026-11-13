import { json, route } from "@/lib/api";
import { enabledProviderIds } from "@/lib/providers";
import { getPricing, toPublicService } from "@/lib/rent";
import { RentService } from "@/models/RentService";

/**
 * Enabled rent services of enabled providers, with their BDT price.
 * Provider cost and provider identity are never included.
 */
export const GET = route(async () => {
  const [pricing, providers] = await Promise.all([getPricing(), enabledProviderIds()]);
  const services = await RentService.find({ enabled: true, availableOnProvider: true, provider: { $in: providers } })
    .sort({ displayOrder: 1, group: 1, name: 1 })
    .lean();
  return json({
    services: services.map((service) => toPublicService(service, pricing)),
    ordersEnabled: pricing.ordersEnabled,
  });
});
