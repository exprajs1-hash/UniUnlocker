import { adminRoute, json } from "@/lib/api";
import { migrateLegacyProvider } from "@/lib/providers";
import { getPricing, providerNameMap, toAdminService, toRentConfigDTO } from "@/lib/rent";
import { RentOrder } from "@/models/RentOrder";
import { RentService } from "@/models/RentService";
import type { RentLastOrderDTO, RentOrderStatus } from "@/types";

/** Every synced service from every provider, for the admin to pick and price. */
export const GET = adminRoute(async () => {
  await migrateLegacyProvider();
  const [pricing, names] = await Promise.all([getPricing(), providerNameMap()]);
  const [services, lastOrders] = await Promise.all([
    RentService.find({}).sort({ enabled: -1, displayOrder: 1, group: 1, name: 1 }).lean(),
    // The newest order per provider service, so the admin can see which services the provider refuses.
    RentOrder.aggregate<{
      _id: { provider: unknown; serviceId: number };
      status: RentOrderStatus;
      adminNote: string;
      result: string;
      createdAt: Date;
    }>([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { provider: "$provider", serviceId: "$serviceId" },
          status: { $first: "$status" },
          adminNote: { $first: "$adminNote" },
          result: { $first: "$result" },
          createdAt: { $first: "$createdAt" },
        },
      },
    ]),
  ]);

  const lastByService = new Map<string, RentLastOrderDTO>(
    lastOrders.map((order) => [
      `${String(order._id.provider)}:${order._id.serviceId}`,
      {
        status: order.status,
        note: order.adminNote || (["rejected", "failed"].includes(order.status) ? order.result : ""),
        at: new Date(order.createdAt).toISOString(),
      },
    ]),
  );

  return json({
    services: services.map((service) =>
      toAdminService(service, pricing, names, lastByService.get(`${String(service.provider)}:${service.serviceId}`) ?? null),
    ),
    config: toRentConfigDTO(pricing),
    rate: pricing.rate,
  });
});
