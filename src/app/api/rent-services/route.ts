import { adminRoute, ApiError, json, readJson } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { migrateLegacyProvider } from "@/lib/providers";
import { getPricing, providerNameMap, toAdminService, toRentConfigDTO } from "@/lib/rent";
import { isBuiltInCategory } from "@/lib/service-categories";
import { manualServiceSchema } from "@/lib/validations";
import { ServiceCategory } from "@/models/ServiceCategory";
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

/**
 * Creates a custom (manual) service: no provider, the admin delivers it by hand.
 * Orders on it wait as "pending" until the admin completes or rejects them.
 */
export const POST = adminRoute(async (request) => {
  const data = manualServiceSchema.parse(await readJson(request));
  await connectToDatabase();
  if (!isBuiltInCategory(data.category) && !(await ServiceCategory.exists({ slug: data.category }))) {
    throw new ApiError(422, "Please check the highlighted fields.", undefined, { category: "This category no longer exists" });
  }
  // Custom services are numbered 1, 2, 3… among themselves (shown to customers as "ID #").
  const last = await RentService.findOne({ manual: true }, { serviceId: 1 }).sort({ serviceId: -1 }).lean();
  const created = await RentService.create({
    ...data,
    customFields: data.customFields.map((field) => ({ ...field, type: field.options.length > 0 ? "select" : "text" })),
    provider: null,
    manual: true,
    serviceId: (last?.serviceId ?? 0) + 1,
    type: "MANUAL",
    group: "",
    costUsd: 0,
    costCurrency: "BDT",
    minQuantity: 1,
    maxQuantity: 1,
    availableOnProvider: true,
  });
  const [pricing, names] = await Promise.all([getPricing(), providerNameMap()]);
  return json({ service: toAdminService(created.toObject(), pricing, names) }, 201);
});
