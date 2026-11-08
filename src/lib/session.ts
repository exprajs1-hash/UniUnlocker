import { SignJWT, jwtVerify } from "jose";

/**
 * JWT helpers with no database or `server-only` imports, so src/proxy.ts can
 * use them for its quick check as well.
 */
export const SESSION_COOKIE = "techpro_admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24; // 1 day

const ISSUER = "techpro-admin";

export interface SessionPayload {
  sub: string;
  ver: number;
}

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(adminId: string, tokenVersion: number): Promise<string> {
  return new SignJWT({ ver: tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.ver !== "number") return null;
    return { sub: payload.sub, ver: payload.ver };
  } catch {
    return null;
  }
}
