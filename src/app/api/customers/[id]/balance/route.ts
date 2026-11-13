import { adminRoute, json, parseObjectId, readJson, type IdContext } from "@/lib/api";
import { changeBalance } from "@/lib/rent";
import { balanceAdjustSchema } from "@/lib/validations";

/** Positive `amount` adds balance (e.g. after a bKash payment), negative deducts it. */
export const POST = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const { amount, note } = balanceAdjustSchema.parse(await readJson(request));
  const fallbackNote = amount > 0 ? "Balance added by admin" : "Balance deducted by admin";
  const balance = await changeBalance(id, amount, amount > 0 ? "admin_credit" : "admin_debit", note || fallbackNote);
  return json({ balance });
});
