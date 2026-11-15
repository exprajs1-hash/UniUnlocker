import { z } from "zod";
import { adminRoute, ApiError, json, parseObjectId, readJson, type IdContext } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { refreshOrder, refundOrder, updateOrderManually } from "@/lib/rent";
import { RentOrder } from "@/models/RentOrder";
import { MANUAL_ORDER_STATUSES } from "@/types";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("refresh") }),
  z.object({ action: z.literal("refund") }),
  z.object({
    action: z.literal("update"),
    status: z.enum(MANUAL_ORDER_STATUSES),
    result: z.string().max(5000, "Keep the result under 5000 characters").default(""),
    providerOrderId: z.string().max(100, "Too long").optional(),
    refund: z.boolean().default(true),
  }),
]);

/**
 * refresh: ask the provider for the latest status now.
 * refund: return the money for an order that will not be delivered
 * (e.g. stuck in "submitting" and not found on the provider).
 * update: set the status and delivered result by hand.
 */
export const POST = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const body = actionSchema.parse(await readJson(request));
  await connectToDatabase();
  const order = await RentOrder.findById(id).lean();
  if (!order) throw new ApiError(404, "Order not found.");

  if (body.action === "refresh") {
    if (!order.providerOrderId) throw new ApiError(422, "This order has no provider reference to check.");
    if (!["pending", "processing"].includes(order.status)) throw new ApiError(422, "Only open orders are checked with the provider.");
    const outcome = await refreshOrder(order, true);
    if (outcome.checked && !outcome.ok) throw new ApiError(502, `Status check failed: ${outcome.error}`);
    const message =
      outcome.checked && outcome.ok
        ? `Provider status: ${outcome.raw || "(empty)"} → ${outcome.state}.`
        : "Status checked.";
    return json({ ok: true, message });
  }

  if (body.action === "update") {
    const { refunded } = await updateOrderManually(id, body);
    return json({ ok: true, refunded });
  }

  if (order.status === "completed") throw new ApiError(422, "A completed order cannot be refunded here.");
  const status = order.status === "submitting" || order.status === "pending" || order.status === "processing" ? "failed" : order.status;
  const done = await refundOrder(id, status, `Refund: ${order.serviceName}`);
  if (!done) throw new ApiError(409, "This order was already refunded.");
  return json({ ok: true });
});
