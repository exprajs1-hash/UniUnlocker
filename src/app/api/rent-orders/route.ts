import { adminRoute, json } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { providerNameMap, refreshOpenOrders, toOrderDTO } from "@/lib/rent";
import { RentOrder } from "@/models/RentOrder";
import { RENT_ORDER_STATUSES, type AdminRentOrderDTO, type RentOrderStatus } from "@/types";

const PAGE_SIZE = 50;

/** `?status=` filters; open orders are checked with the provider first. */
export const GET = adminRoute(async (request) => {
  const params = new URL(request.url).searchParams;
  const status = params.get("status") as RentOrderStatus | null;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const filter = status && RENT_ORDER_STATUSES.includes(status) ? { status } : {};

  await connectToDatabase();
  await refreshOpenOrders({}, 10);
  const [orders, total, names] = await Promise.all([
    RentOrder.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate<{ customer: { _id: unknown; name: string; email: string } | null }>("customer", "name email")
      .lean(),
    RentOrder.countDocuments(filter),
    providerNameMap(),
  ]);

  const dto: AdminRentOrderDTO[] = orders.map(({ customer, ...order }) => ({
    ...toOrderDTO(order),
    serviceId: order.serviceId,
    providerName: names.get(String(order.provider)) ?? "Deleted provider",
    costUsd: order.costUsd,
    providerOrderId: order.providerOrderId,
    adminNote: order.adminNote,
    customer: customer ? { id: String(customer._id), name: customer.name, email: customer.email } : null,
  }));
  return json({ orders: dto, total, page, pageSize: PAGE_SIZE });
});
