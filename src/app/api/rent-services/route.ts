import { adminRoute, json } from "@/lib/api";
import { getPricing, toAdminService, toRentConfigDTO } from "@/lib/rent";
import { RentService } from "@/models/RentService";

/** Every synced provider service, for the admin to pick and price. */
export const GET = adminRoute(async () => {
  const pricing = await getPricing();
  const services = await RentService.find({}).sort({ enabled: -1, displayOrder: 1, group: 1, name: 1 }).lean();
  return json({
    services: services.map((service) => toAdminService(service, pricing)),
    config: toRentConfigDTO(pricing),
    rate: pricing.rate,
  });
});
