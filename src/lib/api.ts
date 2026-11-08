import "server-only";
import { Types } from "mongoose";
import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin, type CurrentAdmin } from "@/lib/auth";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly headers?: Record<string, string>,
  ) {
    super(message);
  }
}

const NO_STORE = { "Cache-Control": "no-store" };

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

function fail(
  status: number,
  error: string,
  extra?: { fieldErrors?: Record<string, string>; headers?: Record<string, string> },
): NextResponse {
  return NextResponse.json(
    { error, fieldErrors: extra?.fieldErrors },
    { status, headers: { ...NO_STORE, ...extra?.headers } },
  );
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    fields[issue.path.join(".")] ??= issue.message;
  }
  return fields;
}

function toResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return fail(error.status, error.message, { headers: error.headers });
  }
  if (error instanceof z.ZodError) {
    return fail(422, "Please check the highlighted fields.", { fieldErrors: fieldErrors(error) });
  }
  if ((error as { code?: number })?.code === 11000) {
    const field = Object.keys((error as { keyPattern?: object }).keyPattern ?? {})[0] ?? "value";
    return fail(409, `That ${field} is already in use.`, {
      fieldErrors: { [field]: `This ${field} is already in use` },
    });
  }
  // Details stay in the server log so internals never reach the client.
  console.error("[api]", error);
  return fail(500, "Something went wrong. Please try again.");
}

/** Wraps a route handler so every thrown error becomes a consistent JSON response. */
export function route<C = unknown>(handler: (request: Request, context: C) => Promise<Response>) {
  return async (request: Request, context: C): Promise<Response> => {
    // Outside the try, so Next's build-time prerender stops here rather than
    // having its internal interruption caught and reported as a server error.
    await connection();
    try {
      return await handler(request, context);
    } catch (error) {
      return toResponse(error);
    }
  };
}

/** Rejects cross-site writes in addition to the SameSite=Strict session cookie. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    // An unparseable origin falls through to the rejection below.
  }
  if (originHost !== host) throw new ApiError(403, "Cross-origin request rejected.");
}

export async function requireAdmin(request: Request): Promise<CurrentAdmin> {
  if (request.method !== "GET") assertSameOrigin(request);
  const admin = await getCurrentAdmin();
  if (!admin) throw new ApiError(401, "Please sign in to continue.");
  return admin;
}

/** A `route` that only runs for a signed-in admin. */
export function adminRoute<C = unknown>(
  handler: (request: Request, context: C, admin: CurrentAdmin) => Promise<Response>,
) {
  return route<C>(async (request, context) => {
    const admin = await requireAdmin(request);
    return handler(request, context, admin);
  });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "The request body must be valid JSON.");
  }
}

export function parseObjectId(id: string): string {
  if (!Types.ObjectId.isValid(id)) throw new ApiError(404, "Not found.");
  return id;
}

export type IdContext = { params: Promise<{ id: string }> };
