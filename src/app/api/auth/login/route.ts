import bcrypt from "bcryptjs";
import { assertSameOrigin, ApiError, json, readJson, route } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { clientIp, consumeRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations";
import { Admin } from "@/models/Admin";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS_PER_IP = 10;
const MAX_ATTEMPTS_PER_EMAIL = 20;

// Compared against when the email is unknown, so response time does not reveal
// whether an account exists.
const DUMMY_HASH = "$2b$12$75ijV/TUu9hl/OPqMqZ8vebjmtcmn38tfm5Nj2k0JEDuFs64QwynK";

export const POST = route(async (request) => {
  assertSameOrigin(request);
  const { email, password } = loginSchema.parse(await readJson(request));
  const ip = clientIp(request);

  const limits = await Promise.all([
    consumeRateLimit("login-ip", ip, MAX_ATTEMPTS_PER_IP, WINDOW_SECONDS),
    consumeRateLimit("login-email", email, MAX_ATTEMPTS_PER_EMAIL, WINDOW_SECONDS),
  ]);
  const blocked = limits.find((limit) => !limit.allowed);
  if (blocked) {
    throw new ApiError(429, "Too many login attempts. Please try again later.", {
      "Retry-After": String(blocked.retryAfter),
    });
  }

  await connectToDatabase();
  const admin = await Admin.findOne({ email }).select("+passwordHash").lean();
  const valid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !valid) throw new ApiError(401, "Incorrect email or password.");

  await Promise.all([
    resetRateLimit("login-ip", ip, WINDOW_SECONDS),
    resetRateLimit("login-email", email, WINDOW_SECONDS),
  ]);
  await setSessionCookie(String(admin._id), admin.tokenVersion);
  return json({ ok: true });
});
