import { json, route } from "@/lib/api";
import { requireCustomer } from "@/lib/customer-auth";
import { serializeMany } from "@/lib/serialize";
import { BalanceTransaction } from "@/models/BalanceTransaction";
import type { BalanceTransactionDTO } from "@/types";

export const GET = route(async (request) => {
  const customer = await requireCustomer(request);
  const transactions = await BalanceTransaction.find({ customer: customer.id }, { customer: 0, order: 0 })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return json({ transactions: serializeMany<BalanceTransactionDTO>(transactions) });
});
