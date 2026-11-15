import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { ApiError } from "@/lib/api";
import { sendMail } from "@/lib/mailer";
import { connectToDatabase } from "@/lib/mongodb";
import { consumeRateLimit } from "@/lib/rate-limit";
import { EmailOtp, type IEmailOtp, type OtpPurpose } from "@/models/EmailOtp";

const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_SENDS_PER_EMAIL_PER_HOUR = 5;
const MAX_WRONG_ATTEMPTS = 5;

function hashCode(email: string, purpose: OtpPurpose, code: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET must be set");
  return createHmac("sha256", secret).update(`${purpose}:${email}:${code}`).digest("hex");
}

const COPY: Record<OtpPurpose, { subject: string; intro: string }> = {
  register: { subject: "Your UniUnlocker verification code", intro: "Use this code to finish creating your UniUnlocker account:" },
  reset: { subject: "Your UniUnlocker password reset code", intro: "Use this code to reset your UniUnlocker password:" },
};

function emailBody(purpose: OtpPurpose, code: string) {
  const { subject, intro } = COPY[purpose];
  const footer = `The code expires in ${CODE_TTL_MINUTES} minutes. If you did not ask for it, you can ignore this email.`;
  return {
    subject,
    text: `${intro}\n\n${code}\n\n${footer}`,
    html: `<!doctype html><html><body style="margin:0;padding:24px;background:#f3f6fb;font-family:Poppins,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px">
<tr><td style="font-size:20px;font-weight:700;color:#1d4ed8">UniUnlocker</td></tr>
<tr><td style="padding-top:16px;font-size:15px;line-height:1.6">${intro}</td></tr>
<tr><td style="padding:20px 0"><div style="font-size:32px;font-weight:800;letter-spacing:10px;text-align:center;background:#eef2ff;border-radius:12px;padding:16px;color:#1e3a8a">${code}</div></td></tr>
<tr><td style="font-size:13px;line-height:1.6;color:#64748b">${footer}</td></tr>
</table></body></html>`,
  };
}

/**
 * Creates (or replaces) the code for this email and purpose and emails it.
 * Enforces a short cooldown between sends and an hourly cap per email.
 */
export async function sendOtp(email: string, purpose: OtpPurpose, pending: IEmailOtp["pending"] = null): Promise<void> {
  await connectToDatabase();
  const existing = await EmailOtp.findOne({ email, purpose }, { sentAt: 1 }).lean();
  if (existing) {
    const wait = RESEND_COOLDOWN_SECONDS - Math.floor((Date.now() - new Date(existing.sentAt).getTime()) / 1000);
    if (wait > 0) {
      throw new ApiError(429, `Please wait ${wait} seconds before asking for a new code.`, { "Retry-After": String(wait) });
    }
  }
  const limit = await consumeRateLimit(`otp-${purpose}`, email, MAX_SENDS_PER_EMAIL_PER_HOUR, 60 * 60);
  if (!limit.allowed) {
    throw new ApiError(429, "Too many codes were sent to this email. Please try again later.", {
      "Retry-After": String(limit.retryAfter),
    });
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  await EmailOtp.findOneAndUpdate(
    { email, purpose },
    {
      $set: {
        codeHash: hashCode(email, purpose, code),
        attempts: 0,
        pending,
        sentAt: now,
        expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60_000),
      },
    },
    { upsert: true },
  );
  try {
    await sendMail({ to: email, ...emailBody(purpose, code) });
  } catch (error) {
    // Not sent, so do not hold the cooldown against the customer.
    await EmailOtp.deleteOne({ email, purpose });
    throw error;
  }
}

/**
 * Checks a code. On success the code is used up and its record returned;
 * otherwise a 400 with how to continue. Too many wrong codes void it.
 */
export async function consumeOtp(email: string, purpose: OtpPurpose, code: string): Promise<IEmailOtp> {
  await connectToDatabase();
  const record = await EmailOtp.findOne({ email, purpose }).lean();
  const invalid = (message: string) => new ApiError(400, message, undefined, { code: message });
  if (!record || record.expiresAt.getTime() < Date.now()) throw invalid("This code has expired. Please ask for a new one.");
  if (record.attempts >= MAX_WRONG_ATTEMPTS) throw invalid("Too many wrong codes. Please ask for a new one.");

  const expected = Buffer.from(record.codeHash, "hex");
  const given = Buffer.from(hashCode(email, purpose, code), "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    await EmailOtp.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    const left = MAX_WRONG_ATTEMPTS - record.attempts - 1;
    throw invalid(left > 0 ? `Wrong code. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Please ask for a new one.");
  }

  // Delete by id and hash so two parallel requests cannot both use the same code.
  const used = await EmailOtp.findOneAndDelete({ _id: record._id, codeHash: record.codeHash }).lean();
  if (!used) throw invalid("This code was already used. Please ask for a new one.");
  return used;
}
