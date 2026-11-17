import { adminRoute, json } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { ContactMessage } from "@/models/ContactMessage";
import { RentOrder } from "@/models/RentOrder";

/** Small numbers for the admin sidebar badges: what needs attention right now. */
export const GET = adminRoute(async () => {
  await connectToDatabase();
  const [customPending, stuck, unreadMessages] = await Promise.all([
    // Custom orders the admin must deliver by hand.
    RentOrder.countDocuments({ manual: true, status: { $in: ["pending", "processing"] } }),
    // Provider orders whose outcome is unknown ("submitting"): the admin must check or refund them.
    RentOrder.countDocuments({ status: "submitting" }),
    ContactMessage.countDocuments({ read: false }),
  ]);
  return json({ ordersNeedingAction: customPending + stuck, unreadMessages });
});
