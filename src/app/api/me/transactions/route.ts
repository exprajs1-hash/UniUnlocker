import { Types } from "mongoose";
import { json, route } from "@/lib/api";
import { requireCustomer } from "@/lib/customer-auth";
import { serializeMany } from "@/lib/serialize";
import { BalanceTransaction } from "@/models/BalanceTransaction";
import type { BalanceTransactionDTO } from "@/types";

/** Wallet history: only money the admin added to (or took off) the balance. Order charges and refunds live with the orders. */
const WALLET_TYPES = ["admin_credit", "admin_debit"] as const;

export const GET = route(async (request) => {
  const customer = await requireCustomer(request);
  const filter = { customer: customer.id, type: { $in: [...WALLET_TYPES] } };
  const [transactions, totals] = await Promise.all([
    BalanceTransaction.find(filter, { customer: 0, order: 0 }).sort({ createdAt: -1 }).limit(100).lean(),
    BalanceTransaction.aggregate<{ _id: null; added: number; deposits: number }>([
      { $match: { customer: new Types.ObjectId(customer.id), type: "admin_credit" } },
      { $group: { _id: null, added: { $sum: "$amount" }, deposits: { $sum: 1 } } },
    ]),
  ]);
  return json({
    transactions: serializeMany<BalanceTransactionDTO>(transactions),
    totalAddedBdt: totals[0]?.added ?? 0,
    depositCount: totals[0]?.deposits ?? 0,
  });
});
