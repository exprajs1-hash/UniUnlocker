import bcrypt from "bcryptjs";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/api";
import { setCustomerSession } from "@/lib/customer-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { clientIp, consumeRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { customerLoginSchema } from "@/lib/validations";
import { Customer } from "@/models/Customer";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS_PER_IP = 15;
const MAX_ATTEMPTS_PER_EMAIL = 10;

// Compared against when the email is unknown, so response time does not reveal whether an account exists.
const DUMMY_HASH = "$2b$12$75ijV/TUu9hl/OPqMqZ8vebjmtcmn38tfm5Nj2k0JEDuFs64QwynK";

export const POST = route(async (request) => {
  assertSameOrigin(request);
  const { email, password } = customerLoginSchema.parse(await readJson(request));
  const ip = clientIp(request);

  const limits = await Promise.all([
    consumeRateLimit("customer-login-ip", ip, MAX_ATTEMPTS_PER_IP, WINDOW_SECONDS),
    consumeRateLimit("customer-login-email", email, MAX_ATTEMPTS_PER_EMAIL, WINDOW_SECONDS),
  ]);
  const blocked = limits.find((limit) => !limit.allowed);
  if (blocked) {
    throw new ApiError(429, "Too many sign-in attempts. Please try again later.", {
      "Retry-After": String(blocked.retryAfter),
    });
  }

  await connectToDatabase();
  const customer = await Customer.findOne({ email }).select("+passwordHash").lean();
  const valid = await bcrypt.compare(password, customer?.passwordHash ?? DUMMY_HASH);
  if (!customer || !valid) throw new ApiError(401, "Incorrect email or password.");
  if (!customer.active) throw new ApiError(403, "This account has been suspended. Please contact support.");

  await Promise.all([
    resetRateLimit("customer-login-ip", ip, WINDOW_SECONDS),
    resetRateLimit("customer-login-email", email, WINDOW_SECONDS),
  ]);
  await setCustomerSession(String(customer._id), customer.tokenVersion);
  return json({ ok: true });
});
