import { json, route } from "@/lib/api";
import { requireCustomer } from "@/lib/customer-auth";

export const GET = route(async (request) => {
  const customer = await requireCustomer(request);
  return json({ customer });
});
