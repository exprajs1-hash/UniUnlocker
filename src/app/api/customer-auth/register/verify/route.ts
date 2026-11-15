import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/api";
import { setCustomerSession } from "@/lib/customer-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { consumeOtp } from "@/lib/otp";
import { verifyEmailSchema } from "@/lib/validations";
import { Customer } from "@/models/Customer";

/** Step 2 of sign-up: confirms the emailed code, creates the account and signs in. */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  const { email, code } = verifyEmailSchema.parse(await readJson(request));
  const { pending } = await consumeOtp(email, "register", code);
  if (!pending) throw new ApiError(400, "This sign-up has expired. Please register again.");

  await connectToDatabase();
  if (await Customer.exists({ email })) {
    throw new ApiError(409, "An account with this email already exists. Try signing in.");
  }
  const customer = await Customer.create({ name: pending.name, email, phone: pending.phone, passwordHash: pending.passwordHash });
  await setCustomerSession(String(customer._id), customer.tokenVersion);
  return json({ ok: true }, 201);
});
