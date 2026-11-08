import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

/**
 * A quick redirect for visitors with no valid session. It is not the security
 * boundary: admin pages and APIs each re-verify the session on the server.
 */
export async function proxy(request: NextRequest) {
  const isLogin = request.nextUrl.pathname === "/admin/login";
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session && !isLogin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next({ headers: { "X-Robots-Tag": "noindex, nofollow" } });
}

export const config = { matcher: "/admin/:path*" };
