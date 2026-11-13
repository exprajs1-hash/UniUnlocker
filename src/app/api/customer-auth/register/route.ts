import bcrypt from "bcryptjs";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/api";
import { setCustomerSession } from "@/lib/customer-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import { customerRegisterSchema } from "@/lib/validations";
import { Customer } from "@/models/Customer";

const MAX_SIGNUPS_PER_IP = 5;
const WINDOW_SECONDS = 60 * 60;

export const POST = route(async (request) => {
  assertSameOrigin(request);
  const { name, email, phone, password } = customerRegisterSchema.parse(await readJson(request));

  const limit = await consumeRateLimit("register-ip", clientIp(request), MAX_SIGNUPS_PER_IP, WINDOW_SECONDS);
  if (!limit.allowed) {
    throw new ApiError(429, "Too many sign-ups from this network. Please try again later.", {
      "Retry-After": String(limit.retryAfter),
    });
  }

  await connectToDatabase();
  if (await Customer.exists({ email })) {
    throw new ApiError(409, "An account with this email already exists.", undefined, {
      email: "This email is already registered. Try signing in.",
    });
  }
  const customer = await Customer.create({ name, email, phone, passwordHash: await bcrypt.hash(password, 12) });
  await setCustomerSession(String(customer._id), customer.tokenVersion);
  return json({ ok: true }, 201);
});
