import bcrypt from "bcryptjs";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/api";
import { setCustomerSession } from "@/lib/customer-auth";
import { connectToDatabase } from "@/lib/mongodb";
import { consumeOtp } from "@/lib/otp";
import { resetPasswordSchema } from "@/lib/validations";
import { Customer } from "@/models/Customer";

/**
 * Sets a new password after the emailed code is confirmed. Every other session
 * is signed out (tokenVersion bump) and this browser is signed in.
 */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  const { email, code, password } = resetPasswordSchema.parse(await readJson(request));
  await consumeOtp(email, "reset", code);

  await connectToDatabase();
  const customer = await Customer.findOneAndUpdate(
    { email, active: true },
    { $set: { passwordHash: await bcrypt.hash(password, 12) }, $inc: { tokenVersion: 1 } },
    { returnDocument: "after" },
  ).lean();
  if (!customer) throw new ApiError(400, "This account cannot be reset. Please contact support.");
  await setCustomerSession(String(customer._id), customer.tokenVersion);
  return json({ ok: true });
});
