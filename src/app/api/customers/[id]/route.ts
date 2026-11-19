import { adminRoute, ApiError, json, parseObjectId, readJson, type IdContext } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toOrderDTO } from "@/lib/rent";
import { serialize, serializeMany } from "@/lib/serialize";
import { customerPatchSchema } from "@/lib/validations";
import { BalanceTransaction } from "@/models/BalanceTransaction";
import { Customer } from "@/models/Customer";
import { Deposit } from "@/models/Deposit";
import { EmailOtp } from "@/models/EmailOtp";
import { RentOrder } from "@/models/RentOrder";
import type { BalanceTransactionDTO, CustomerDTO } from "@/types";

const NOT_FOUND = new ApiError(404, "Customer not found.");

/** One customer with their recent wallet history and orders. */
export const GET = adminRoute<IdContext>(async (_request, { params }) => {
  const id = parseObjectId((await params).id);
  await connectToDatabase();
  const [customer, transactions, orders] = await Promise.all([
    Customer.findById(id, { tokenVersion: 0 }).lean(),
    BalanceTransaction.find({ customer: id }, { customer: 0, order: 0 }).sort({ createdAt: -1 }).limit(50).lean(),
    RentOrder.find({ customer: id }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  if (!customer) throw NOT_FOUND;
  return json({
    customer: serialize<CustomerDTO>(customer),
    transactions: serializeMany<BalanceTransactionDTO>(transactions),
    orders: orders.map(toOrderDTO),
  });
});

/**
 * Block/unblock, set the personal price rate or the display tag. Blocking also signs the
 * customer out everywhere; unblocking clears the wrong-password count and the auto-lock.
 */
export const PATCH = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const { active, priceAdjustPercent, tag } = customerPatchSchema.parse(await readJson(request));
  await connectToDatabase();
  const set = {
    ...(active !== undefined ? { active, failedLogins: 0, autoBlocked: false } : {}),
    ...(priceAdjustPercent !== undefined ? { priceAdjustPercent } : {}),
    ...(tag !== undefined ? { tag } : {}),
  };
  const update = active === false ? { $set: set, $inc: { tokenVersion: 1 } } : { $set: set };
  const customer = await Customer.findByIdAndUpdate(id, update, {
    returnDocument: "after",
    projection: { tokenVersion: 0 },
  }).lean();
  if (!customer) throw NOT_FOUND;
  return json({ customer: serialize<CustomerDTO>(customer) });
});

/**
 * Deletes the account, its wallet history, its deposits and any pending email codes.
 * Orders are kept for the admin's records and show as "Deleted customer". Refused while
 * an order is still running, since a refund would have no wallet to go back to.
 */
export const DELETE = adminRoute<IdContext>(async (_request, { params }) => {
  const id = parseObjectId((await params).id);
  await connectToDatabase();
  const customer = await Customer.findById(id, { email: 1 }).lean();
  if (!customer) throw NOT_FOUND;

  const running = await RentOrder.exists({ customer: id, status: { $in: ["submitting", "pending", "processing"] } });
  if (running) {
    throw new ApiError(409, "This customer has orders still in progress. Finish or refund them before deleting the account.");
  }

  await Customer.deleteOne({ _id: id });
  await Promise.all([
    BalanceTransaction.deleteMany({ customer: id }),
    Deposit.deleteMany({ customer: id }),
    EmailOtp.deleteMany({ email: customer.email }),
  ]);
  return json({ ok: true });
});
