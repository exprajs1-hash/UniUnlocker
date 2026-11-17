import { json, route } from "@/lib/api";
import { requireCustomer } from "@/lib/customer-auth";

export const GET = route(async (request) => {
  const { id, name, email, phone, balance, tag, avatar } = await requireCustomer(request);
  // Listed field by field so server-only values (the personal price rate) never reach the browser.
  return json({ customer: { id, name, email, phone, balance, tag, avatar } });
});
