import { timingSafeEqual } from "node:crypto";
import { ApiError, json, route } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { autoSyncStaleProvider } from "@/lib/providers";
import { refreshOpenOrders } from "@/lib/rent";

/** Open orders checked per run, oldest check first. */
const BATCH = 30;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16) return false;
  // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>"; other schedulers can use ?key=.
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const given = header || new URL(request.url).searchParams.get("key") || "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Checks open orders with their providers even when nobody has the orders page
 * open. Call it every minute from a scheduler (Vercel Cron, cron-job.org, or a
 * server crontab) with the CRON_SECRET.
 */
export const GET = route(async (request) => {
  if (!process.env.CRON_SECRET) throw new ApiError(503, "Set CRON_SECRET to turn on background order checks.");
  if (!authorized(request)) throw new ApiError(401, "Not allowed.");
  await connectToDatabase();
  await refreshOpenOrders({}, BATCH);
  // Keeps each provider's service list (input fields, quantity limits, costs) fresh.
  await autoSyncStaleProvider().catch((error: unknown) => console.error("[rent] Automatic sync failed:", error));
  return json({ ok: true });
});
