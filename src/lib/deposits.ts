import "server-only";
import { Types } from "mongoose";
import { roundMoney } from "@/lib/money";
import { connectToDatabase } from "@/lib/mongodb";
import { changeBalance } from "@/lib/rent";
import { verifyInvoice } from "@/lib/zinipay";
import { Deposit } from "@/models/Deposit";

export const MIN_DEPOSIT_BDT = 10;
export const MAX_DEPOSIT_BDT = 50_000;

export type SettleOutcome = "completed" | "already" | "pending" | "invalid";

/**
 * Checks an invoice with ZiniPay and, when it is paid, credits the matching deposit
 * exactly once. Safe to call from both the customer's return and the webhook, in any
 * order or at the same time: only the call that flips the deposit to "completed" credits.
 */
export async function settleInvoice(invoiceId: string): Promise<SettleOutcome> {
  if (!invoiceId || invoiceId.length > 200) return "invalid";
  const invoice = await verifyInvoice(invoiceId);
  if (!Types.ObjectId.isValid(invoice.depositId)) return "invalid";

  await connectToDatabase();
  const deposit = await Deposit.findById(invoice.depositId).lean();
  if (!deposit) return "invalid";
  if (deposit.status === "completed") return "already";
  if (invoice.status !== "COMPLETED") return "pending";
  // Paid less than this deposit asked for (e.g. a tampered invoice): never credit it automatically.
  if (roundMoney(invoice.amount) < roundMoney(deposit.amount)) return "invalid";

  let claimed;
  try {
    claimed = await Deposit.findOneAndUpdate(
      { _id: deposit._id, status: "pending" },
      {
        $set: {
          status: "completed",
          invoiceId,
          transactionId: invoice.transactionId.slice(0, 100),
          method: invoice.method.slice(0, 40),
        },
      },
      { returnDocument: "after" },
    ).lean();
  } catch (error) {
    // Duplicate invoiceId: this invoice already paid for another deposit.
    if ((error as { code?: number }).code === 11000) return "invalid";
    throw error;
  }
  if (!claimed) return "already";

  const via = invoice.method ? ` via ${invoice.method}` : "";
  const txn = invoice.transactionId ? ` (TrxID ${invoice.transactionId})` : "";
  await changeBalance(String(claimed.customer), claimed.amount, "deposit", `Online payment${via}${txn}`.slice(0, 300));
  return "completed";
}
