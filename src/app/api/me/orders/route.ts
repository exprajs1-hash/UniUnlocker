import { ApiError, json, readJson, route } from "@/lib/api";
import { requireCustomer } from "@/lib/customer-auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { notifyOrderPlaced } from "@/lib/notifications";
import { followUpOrder, placeOrder, refreshOpenOrders, toOrderDTO } from "@/lib/rent";
import { rentOrderSchema } from "@/lib/validations";
import { RentOrder } from "@/models/RentOrder";
import type { RentOrderStatsDTO, RentOrderStatus } from "@/types";
import { Types } from "mongoose";
import { after } from "next/server";

const MAX_ORDERS_PER_MINUTE = 6;

/** The customer's latest orders plus totals over all of them. Open ones are checked with the provider first. */
export const GET = route(async (request) => {
  const customer = await requireCustomer(request);
  await refreshOpenOrders({ customer: customer.id });
  const [orders, groups] = await Promise.all([
    RentOrder.find({ customer: customer.id }).sort({ createdAt: -1 }).limit(100).lean(),
    RentOrder.aggregate<{ _id: { status: RentOrderStatus; refunded: boolean }; count: number; amount: number }>([
      { $match: { customer: new Types.ObjectId(customer.id) } },
      { $group: { _id: { status: "$status", refunded: "$refunded" }, count: { $sum: 1 }, amount: { $sum: "$priceBdt" } } },
    ]),
  ]);

  const stats: RentOrderStatsDTO = { total: 0, pending: 0, processing: 0, completed: 0, cancelled: 0, lockedBdt: 0, spentBdt: 0 };
  for (const { _id, count, amount } of groups) {
    stats.total += count;
    if (_id.status === "submitting" || _id.status === "pending") stats.pending += count;
    else if (_id.status === "processing") stats.processing += count;
    else if (_id.status === "completed") stats.completed += count;
    else stats.cancelled += count;
    if (["submitting", "pending", "processing"].includes(_id.status)) stats.lockedBdt += amount;
    if (_id.status === "completed" && !_id.refunded) stats.spentBdt += amount;
  }
  return json({ orders: orders.map(toOrderDTO), stats });
});

export const POST = route(async (request) => {
  const customer = await requireCustomer(request);
  const { serviceId, fields, quantity } = rentOrderSchema.parse(await readJson(request));

  const limit = await consumeRateLimit("rent-order", customer.id, MAX_ORDERS_PER_MINUTE, 60);
  if (!limit.allowed) {
    throw new ApiError(429, "You are ordering too quickly. Please wait a moment.", {
      "Retry-After": String(limit.retryAfter),
    });
  }

  const result = await placeOrder(customer.id, serviceId, fields, quantity, customer.priceAdjustPercent);
  // Many services finish within seconds: check back a few times after replying, so the order
  // completes even if the customer closes the page right away.
  notifyOrderPlaced(result.order.id);
  if (result.order.status === "pending" || result.order.status === "processing") after(() => followUpOrder(result.order.id));
  return json(result, 201);
});
