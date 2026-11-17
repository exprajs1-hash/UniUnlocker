import { json, route } from "@/lib/api";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { enabledProviderIds } from "@/lib/providers";
import { getPricing, toPublicService } from "@/lib/rent";
import { RentService } from "@/models/RentService";

/**
 * Enabled rent services of enabled providers, with their BDT price. A signed-in
 * customer sees their personal rate. Provider cost and identity are never included.
 */
export const GET = route(async () => {
  const [pricing, providers, customer] = await Promise.all([getPricing(), enabledProviderIds(), getCurrentCustomer()]);
  const adjust = customer?.priceAdjustPercent ?? 0;
  const services = await RentService.find({ enabled: true, availableOnProvider: true, $or: [{ provider: { $in: providers } }, { manual: true }] })
    .sort({ displayOrder: 1, group: 1, name: 1 })
    .lean();
  return json({
    services: services.map((service) => toPublicService(service, pricing, adjust)),
    ordersEnabled: pricing.ordersEnabled,
  });
});
