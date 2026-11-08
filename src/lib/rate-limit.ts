import "server-only";
import { createHash } from "node:crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { RateLimit } from "@/models/RateLimit";

/**
 * The address reported by the nearest proxy. The leftmost X-Forwarded-For value
 * is set by the client and can be forged, so only the rightmost hop is used.
 */
export function clientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
}

function windowFor(scope: string, identifier: string, windowSeconds: number) {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  // Hashed so IP addresses and emails are not stored in plain text.
  const hash = createHash("sha256").update(identifier).digest("hex").slice(0, 32);
  return {
    key: `${scope}:${hash}:${windowStart}`,
    retryAfter: Math.ceil((windowStart + windowMs - now) / 1000),
    expiresAt: new Date(windowStart + windowMs),
  };
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

/** Counts one attempt in a fixed window and reports whether it is within the limit. */
export async function consumeRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  await connectToDatabase();
  const { key, retryAfter, expiresAt } = windowFor(scope, identifier, windowSeconds);
  const entry = await RateLimit.findOneAndUpdate(
    { key },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { upsert: true, returnDocument: "after" },
  ).lean();
  return { allowed: (entry?.count ?? 1) <= limit, retryAfter };
}

/** Clears a counter early, for example after a successful login. */
export async function resetRateLimit(
  scope: string,
  identifier: string,
  windowSeconds: number,
): Promise<void> {
  await RateLimit.deleteOne({ key: windowFor(scope, identifier, windowSeconds).key });
}
