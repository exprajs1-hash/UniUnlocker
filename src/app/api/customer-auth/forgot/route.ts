import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { sendOtp } from "@/lib/otp";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validations";
import { Customer } from "@/models/Customer";

const MAX_REQUESTS_PER_IP = 10;
const WINDOW_SECONDS = 60 * 60;

/**
 * Emails a password reset code. The reply is the same whether or not the
 * email has an account, so this cannot be used to find out who is registered.
 */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  const { email } = forgotPasswordSchema.parse(await readJson(request));

  const limit = await consumeRateLimit("forgot-ip", clientIp(request), MAX_REQUESTS_PER_IP, WINDOW_SECONDS);
  if (!limit.allowed) {
    throw new ApiError(429, "Too many requests from this network. Please try again later.", {
      "Retry-After": String(limit.retryAfter),
    });
  }

  await connectToDatabase();
  const customer = await Customer.findOne({ email }, { active: 1 }).lean();
  if (customer?.active) await sendOtp(email, "reset");
  return json({ otpSent: true, email });
});
