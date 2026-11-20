import { Types } from "mongoose";
import { ApiError, json, route, type IdContext } from "@/lib/api";
import { requireCustomer } from "@/lib/customer-auth";
import { isWatchingResult, refreshOrder, toOrderDetailDTO } from "@/lib/rent";
import { RentOrder } from "@/models/RentOrder";

/** One of the signed-in customer's orders with its timeline. An open (or just completed) order is checked with the provider first. */
export const GET = route<IdContext>(async (request, { params }) => {
  const customer = await requireCustomer(request);
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(404, "Order not found.");

  // Scoped to the customer, so nobody can open another customer's order by guessing its id.
  const filter = { _id: id, customer: customer.id };
  let order = await RentOrder.findOne(filter).lean();
  if (!order) throw new ApiError(404, "Order not found.");
  if (order.status === "pending" || order.status === "processing" || isWatchingResult(order)) {
    await refreshOrder(order).catch(() => undefined);
    order = (await RentOrder.findOne(filter).lean()) ?? order;
  }
  return json({ order: toOrderDetailDTO(order) });
});
