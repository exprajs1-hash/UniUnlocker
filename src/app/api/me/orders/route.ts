import { ApiError, json, readJson, route } from "@/lib/api";
import { requireCustomer } from "@/lib/customer-auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { placeOrder, refreshOpenOrders, toOrderDTO } from "@/lib/rent";
import { rentOrderSchema } from "@/lib/validations";
import { RentOrder } from "@/models/RentOrder";

const MAX_ORDERS_PER_MINUTE = 6;

/** The customer's latest orders. Open ones are checked with the provider first. */
export const GET = route(async (request) => {
  const customer = await requireCustomer(request);
  await refreshOpenOrders({ customer: customer.id });
  const orders = await RentOrder.find({ customer: customer.id }).sort({ createdAt: -1 }).limit(100).lean();
  return json({ orders: orders.map(toOrderDTO) });
});

export const POST = route(async (request) => {
  const customer = await requireCustomer(request);
  const { serviceId, fields } = rentOrderSchema.parse(await readJson(request));

  const limit = await consumeRateLimit("rent-order", customer.id, MAX_ORDERS_PER_MINUTE, 60);
  if (!limit.allowed) {
    throw new ApiError(429, "You are ordering too quickly. Please wait a moment.", {
      "Retry-After": String(limit.retryAfter),
    });
  }

  const result = await placeOrder(customer.id, serviceId, fields);
  return json(result, 201);
});
