import { z } from "zod";
import { adminRoute, ApiError, json, parseObjectId, readJson, type IdContext } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { refreshOrder, refundOrder } from "@/lib/rent";
import { RentOrder } from "@/models/RentOrder";

const actionSchema = z.object({ action: z.enum(["refresh", "refund"]) });

/**
 * refresh: ask the provider for the latest status now.
 * refund: return the money for an order that will not be delivered
 * (e.g. stuck in "submitting" and not found on the provider).
 */
export const POST = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const { action } = actionSchema.parse(await readJson(request));
  await connectToDatabase();
  const order = await RentOrder.findById(id).lean();
  if (!order) throw new ApiError(404, "Order not found.");

  if (action === "refresh") {
    if (!order.providerOrderId) throw new ApiError(422, "This order has no provider reference to check.");
    await refreshOrder(order, true);
  } else {
    if (order.status === "completed") throw new ApiError(422, "A completed order cannot be refunded here.");
    const status = order.status === "submitting" || order.status === "pending" || order.status === "processing" ? "failed" : order.status;
    const done = await refundOrder(id, status, `Refund: ${order.serviceName}`);
    if (!done) throw new ApiError(409, "This order was already refunded.");
  }
  return json({ ok: true });
});
