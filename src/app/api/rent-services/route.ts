import { adminRoute, json } from "@/lib/api";
import { migrateLegacyProvider } from "@/lib/providers";
import { getPricing, providerNameMap, toAdminService, toRentConfigDTO } from "@/lib/rent";
import { RentService } from "@/models/RentService";

/** Every synced service from every provider, for the admin to pick and price. */
export const GET = adminRoute(async () => {
  await migrateLegacyProvider();
  const [pricing, names] = await Promise.all([getPricing(), providerNameMap()]);
  const services = await RentService.find({}).sort({ enabled: -1, displayOrder: 1, group: 1, name: 1 }).lean();
  return json({
    services: services.map((service) => toAdminService(service, pricing, names)),
    config: toRentConfigDTO(pricing),
    rate: pricing.rate,
  });
});
