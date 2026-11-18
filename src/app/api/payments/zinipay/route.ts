import { connection } from "next/server";
import { settleInvoice } from "@/lib/deposits";
import { SITE_URL } from "@/lib/seo";

/**
 * ZiniPay calls this URL twice per payment: the customer's browser comes back here
 * (GET ?invoice_id=…), and ZiniPay's server posts a webhook. Neither is trusted:
 * both only pass along an invoice id, which settleInvoice checks with ZiniPay itself.
 */

function invoiceIdFrom(url: URL, body: unknown): string {
  const fromQuery = url.searchParams.get("invoice_id");
  if (fromQuery) return fromQuery.trim();
  if (body && typeof body === "object" && "invoice_id" in body) return String((body as { invoice_id: unknown }).invoice_id ?? "").trim();
  return "";
}

/** The customer returning from the payment page. */
export async function GET(request: Request) {
  await connection();
  const invoiceId = invoiceIdFrom(new URL(request.url), null);
  let result = "failed";
  try {
    const outcome = await settleInvoice(invoiceId);
    result = outcome === "completed" || outcome === "already" ? "success" : outcome === "pending" ? "pending" : "failed";
  } catch (error) {
    console.error("[zinipay] return", error);
    // The webhook may still credit it; tell the customer it is being checked.
    result = "pending";
  }
  return Response.redirect(`${SITE_URL}/account?deposit=${result}`, 303);
}

/** ZiniPay's server-to-server notification. */
export async function POST(request: Request) {
  await connection();
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // Some callbacks only use the query string.
  }
  const invoiceId = invoiceIdFrom(new URL(request.url), body);
  if (!invoiceId) return Response.json({ ok: false, message: "Missing invoice_id" }, { status: 400 });
  try {
    const outcome = await settleInvoice(invoiceId);
    return Response.json({ ok: true, outcome });
  } catch (error) {
    console.error("[zinipay] webhook", error);
    // A 5xx lets ZiniPay retry later.
    return Response.json({ ok: false }, { status: 500 });
  }
}
