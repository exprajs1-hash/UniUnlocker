import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { ApiError } from "@/lib/api";

/**
 * Outgoing email over SMTP, configured with SMTP_HOST, SMTP_PORT, SMTP_USER,
 * SMTP_PASS and SMTP_FROM. Port 465 uses TLS from the start; other ports
 * (587, 25) upgrade with STARTTLS.
 */

let transporter: Transporter | null = null;

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter(): Transporter {
  if (transporter) return transporter;
  const port = Number(process.env.SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail(mail: Mail): Promise<void> {
  if (!smtpConfigured()) {
    // Local development without SMTP: print the message so the flow can still be tested.
    if (process.env.NODE_ENV !== "production") {
      console.log(`[mail] SMTP is not set up. Would send to ${mail.to}: ${mail.subject}\n${mail.text}`);
      return;
    }
    throw new ApiError(503, "Email is not available right now. Please contact support.");
  }
  try {
    await getTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  } catch (error) {
    console.error("[mail] Sending failed:", error);
    throw new ApiError(502, "We could not send the email. Please try again in a minute.");
  }
}
