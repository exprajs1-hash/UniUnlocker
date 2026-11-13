import { assertSameOrigin, json, route } from "@/lib/api";
import { clearCustomerSession } from "@/lib/customer-auth";

export const POST = route(async (request) => {
  assertSameOrigin(request);
  await clearCustomerSession();
  return json({ ok: true });
});
