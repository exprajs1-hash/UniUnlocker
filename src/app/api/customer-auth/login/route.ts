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
/** Wrong passwords in a row before the account is blocked; only an admin can unblock it. */
const MAX_WRONG_PASSWORDS = 5;
const LOCKED_MESSAGE = "This account was locked after too many wrong passwords. Please contact support to unlock it.";

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
  if (customer && !valid && customer.active) {
    // Count the wrong password; the one that reaches the limit blocks the account until an admin unblocks it.
    const counted = await Customer.findOneAndUpdate(
      { _id: customer._id, active: true },
      { $inc: { failedLogins: 1 } },
      { returnDocument: "after", projection: { failedLogins: 1 } },
    ).lean();
    if (counted && counted.failedLogins >= MAX_WRONG_PASSWORDS) {
      await Customer.updateOne(
        { _id: customer._id, active: true },
        { $set: { active: false, autoBlocked: true }, $inc: { tokenVersion: 1 } },
      );
      throw new ApiError(403, LOCKED_MESSAGE);
    }
  }
  if (!customer || !valid) throw new ApiError(401, "Incorrect email or password.");
  if (!customer.active) {
    throw new ApiError(403, customer.autoBlocked ? LOCKED_MESSAGE : "This account has been suspended. Please contact support.");
  }

  if (customer.failedLogins) await Customer.updateOne({ _id: customer._id }, { $set: { failedLogins: 0 } });
  await Promise.all([
    resetRateLimit("customer-login-ip", ip, WINDOW_SECONDS),
    resetRateLimit("customer-login-email", email, WINDOW_SECONDS),
  ]);
  await setCustomerSession(String(customer._id), customer.tokenVersion);
  return json({ ok: true });
});
