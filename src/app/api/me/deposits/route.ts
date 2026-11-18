import { z } from "zod";
import { ApiError, json, readJson, route } from "@/lib/api";
import { requireCustomer } from "@/lib/customer-auth";
import { MAX_DEPOSIT_BDT, MIN_DEPOSIT_BDT } from "@/lib/deposits";
import { isMoney } from "@/lib/money";
import { SITE_URL } from "@/lib/seo";
import { createInvoice, zinipayEnabled, ZiniPayError } from "@/lib/zinipay";
import { Deposit } from "@/models/Deposit";

const depositSchema = z.object({
  amount: z.coerce
    .number({ error: "Enter an amount" })
    .refine(isMoney, "Use at most 2 decimals (paisa)")
    .refine((value) => value >= MIN_DEPOSIT_BDT, `The minimum is ৳${MIN_DEPOSIT_BDT}`)
    .refine((value) => value <= MAX_DEPOSIT_BDT, `The maximum is ৳${MAX_DEPOSIT_BDT.toLocaleString("en-US")}`),
});

/** Starts an "Add balance" payment: returns the ZiniPay page the customer pays on. */
export const POST = route(async (request) => {
  const customer = await requireCustomer(request);
  if (!zinipayEnabled()) throw new ApiError(503, "Online payment is not available right now. Please contact us to add balance.");
  const { amount } = depositSchema.parse(await readJson(request));

  // Each click makes an invoice at ZiniPay, so a burst of clicks is slowed down.
  const recent = await Deposit.countDocuments({ customer: customer.id, createdAt: { $gte: new Date(Date.now() - 10 * 60_000) } });
  if (recent >= 5) throw new ApiError(429, "Too many payment attempts. Please wait a few minutes and try again.");

  const deposit = await Deposit.create({ customer: customer.id, amount });
  const callback = `${SITE_URL}/api/payments/zinipay`;
  try {
    const paymentUrl = await createInvoice({
      amount,
      name: customer.name,
      email: customer.email,
      depositId: String(deposit._id),
      redirectUrl: callback,
      cancelUrl: `${SITE_URL}/account?deposit=cancelled`,
      webhookUrl: callback,
    });
    return json({ paymentUrl });
  } catch (error) {
    await Deposit.updateOne({ _id: deposit._id }, { $set: { status: "failed" } });
    if (error instanceof ZiniPayError) {
      console.error("[zinipay]", error.message);
      throw new ApiError(502, "The payment page could not be opened. Please try again in a moment.");
    }
    throw error;
  }
});
