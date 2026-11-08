import { assertSameOrigin, json, route } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export const POST = route(async (request) => {
  assertSameOrigin(request);
  await clearSessionCookie();
  return json({ ok: true });
});
