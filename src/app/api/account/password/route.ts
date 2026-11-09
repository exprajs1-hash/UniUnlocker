import bcrypt from "bcryptjs";
import { adminRoute, ApiError, json, readJson } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";
import { consumeRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { changePasswordSchema } from "@/lib/validations";
import { Admin } from "@/models/Admin";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 10;
const BCRYPT_COST = 12;

export const PUT = adminRoute(async (request, _context, currentAdmin) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(await readJson(request));

  // A stolen session should not be able to guess the current password indefinitely.
  const limit = await consumeRateLimit("change-password", currentAdmin.id, MAX_ATTEMPTS, WINDOW_SECONDS);
  if (!limit.allowed) {
    throw new ApiError(429, "Too many attempts. Please try again later.", {
      "Retry-After": String(limit.retryAfter),
    });
  }

  const admin = await Admin.findById(currentAdmin.id).select("+passwordHash").lean();
  if (!admin) throw new ApiError(401, "Please sign in to continue.");

  if (!(await bcrypt.compare(currentPassword, admin.passwordHash))) {
    throw new ApiError(422, "Please check the highlighted fields.", undefined, {
      currentPassword: "Current password is incorrect",
    });
  }

  // Matching on tokenVersion means a concurrent change cannot be overwritten.
  const updated = await Admin.findOneAndUpdate(
    { _id: admin._id, tokenVersion: admin.tokenVersion },
    { $set: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_COST) }, $inc: { tokenVersion: 1 } },
    { returnDocument: "after" },
  ).lean();
  if (!updated) throw new ApiError(409, "Your password was just changed elsewhere. Please sign in again.");

  await resetRateLimit("change-password", currentAdmin.id, WINDOW_SECONDS);
  // The new tokenVersion signs out every other session; this one gets a fresh cookie.
  await setSessionCookie(String(updated._id), updated.tokenVersion);
  return json({ ok: true });
});
