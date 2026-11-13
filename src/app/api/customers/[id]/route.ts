import { adminRoute, ApiError, json, parseObjectId, readJson, type IdContext } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { toOrderDTO } from "@/lib/rent";
import { serialize, serializeMany } from "@/lib/serialize";
import { customerPatchSchema } from "@/lib/validations";
import { BalanceTransaction } from "@/models/BalanceTransaction";
import { Customer } from "@/models/Customer";
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

/** Block or unblock. Blocking also signs the customer out everywhere. */
export const PATCH = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const { active } = customerPatchSchema.parse(await readJson(request));
  await connectToDatabase();
  const update = active ? { $set: { active } } : { $set: { active }, $inc: { tokenVersion: 1 } };
  const customer = await Customer.findByIdAndUpdate(id, update, {
    returnDocument: "after",
    projection: { tokenVersion: 0 },
  }).lean();
  if (!customer) throw NOT_FOUND;
  return json({ customer: serialize<CustomerDTO>(customer) });
});
