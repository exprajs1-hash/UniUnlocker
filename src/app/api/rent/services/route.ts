import { json, route } from "@/lib/api";
import { getPricing, toPublicService } from "@/lib/rent";
import { RentService } from "@/models/RentService";

/** Enabled rent services with their BDT price. Provider cost is never included. */
export const GET = route(async () => {
  const pricing = await getPricing();
  const services = await RentService.find({ enabled: true, availableOnProvider: true })
    .sort({ displayOrder: 1, group: 1, name: 1 })
    .lean();
  return json({
    services: services.map((service) => toPublicService(service, pricing)),
    ordersEnabled: pricing.ordersEnabled,
  });
});
