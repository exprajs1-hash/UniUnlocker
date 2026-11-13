import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ApiError, assertSameOrigin } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { Customer } from "@/models/Customer";

/**
 * Customer sessions. A different cookie and JWT issuer from the admin session,
 * so a customer token can never be accepted by the admin panel or vice versa.
 */
const COOKIE = "uu_customer_session";
const ISSUER = "uniunlocker-customer";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must be set and at least 32 characters long");
  return new TextEncoder().encode(secret);
}

export interface CurrentCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
}

export async function setCustomerSession(customerId: string, tokenVersion: number): Promise<void> {
  const token = await new SignJWT({ ver: tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(customerId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax, so following a link to the site (e.g. from WhatsApp) keeps the customer signed in.
    // Writes are still protected by assertSameOrigin.
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearCustomerSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function getCurrentCustomer(): Promise<CurrentCustomer | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let sub: string;
  let ver: number;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: ISSUER, algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.ver !== "number") return null;
    sub = payload.sub;
    ver = payload.ver;
  } catch {
    return null;
  }

  await connectToDatabase();
  const customer = await Customer.findById(sub).lean();
  if (!customer || !customer.active || customer.tokenVersion !== ver) return null;
  return {
    id: String(customer._id),
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    balance: customer.balance,
  };
}

export async function requireCustomer(request: Request): Promise<CurrentCustomer> {
  if (request.method !== "GET") assertSameOrigin(request);
  const customer = await getCurrentCustomer();
  if (!customer) throw new ApiError(401, "Please sign in to continue.");
  return customer;
}
