import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectToDatabase } from "@/lib/mongodb";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "@/lib/session";
import { Admin } from "@/models/Admin";

export interface CurrentAdmin {
  id: string;
  email: string;
  name: string;
}

/**
 * The authoritative check: verifies the JWT, then confirms against MongoDB that
 * the admin still exists and the session has not been revoked.
 */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  await connectToDatabase();
  const admin = await Admin.findById(session.sub).lean();
  if (!admin || admin.tokenVersion !== session.ver) return null;
  return { id: String(admin._id), email: admin.email, name: admin.name };
}

/** For server-rendered admin pages. */
export async function requireAdminPage(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function setSessionCookie(adminId: string, tokenVersion: number): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(adminId, tokenVersion), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
