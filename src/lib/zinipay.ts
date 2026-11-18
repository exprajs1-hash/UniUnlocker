import "server-only";

/**
 * ZiniPay hosted payments (bKash, Nagad, … into the site owner's own account).
 * The API mirrors ZiniPay's official WooCommerce plugin: JSON POSTs with a
 * `zini-api-key` header to /v1/payment/create and /v1/payment/verify.
 */

const API_URL = (process.env.ZINIPAY_API_URL || "https://api.zinipay.com").replace(/\/+$/, "");

export function zinipayEnabled(): boolean {
  return Boolean(process.env.ZINIPAY_API_KEY);
}

export class ZiniPayError extends Error {}

async function call<T>(path: string, body: Record<string, unknown>): Promise<T & { status?: unknown; message?: string }> {
  const key = process.env.ZINIPAY_API_KEY;
  if (!key) throw new ZiniPayError("Online payment is not set up.");
  let response: Response;
  try {
    response = await fetch(`${API_URL}/${path}`, {
      method: "POST",
      headers: { "zini-api-key": key, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new ZiniPayError(`ZiniPay could not be reached: ${(error as Error).message}`);
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new ZiniPayError(`ZiniPay sent an invalid response (HTTP ${response.status}).`);
  }
}

export interface CreateInvoiceInput {
  amount: number;
  name: string;
  email: string;
  /** Our deposit id; ZiniPay returns it on verify, so a paid invoice is tied to exactly one deposit. */
  depositId: string;
  redirectUrl: string;
  cancelUrl: string;
  webhookUrl: string;
}

/** Creates a hosted invoice and returns the page the customer pays on. */
export async function createInvoice(input: CreateInvoiceInput): Promise<string> {
  const data = await call<{ payment_url?: string }>("v1/payment/create", {
    amount: input.amount,
    cus_name: input.name || "Customer",
    cus_email: input.email,
    metadata: { deposit_id: input.depositId },
    redirect_url: input.redirectUrl,
    cancel_url: input.cancelUrl,
    webhook_url: input.webhookUrl,
  });
  if (!data.payment_url || !/^https:\/\//.test(data.payment_url)) {
    throw new ZiniPayError(data.message || "ZiniPay did not return a payment link.");
  }
  return data.payment_url;
}

export interface VerifiedInvoice {
  /** "COMPLETED" once the money has arrived; anything else is not paid (yet). */
  status: string;
  amount: number;
  transactionId: string;
  method: string;
  depositId: string;
}

/** Asks ZiniPay itself about an invoice. Callback bodies are never trusted; this is. */
export async function verifyInvoice(invoiceId: string): Promise<VerifiedInvoice> {
  const data = await call<{
    amount?: unknown;
    transaction_id?: unknown;
    payment_method?: unknown;
    metadata?: { deposit_id?: unknown } | string | null;
  }>("v1/payment/verify", { invoice_id: invoiceId });
  // Some gateways echo metadata back as a JSON string.
  let metadata = data.metadata;
  if (typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = null;
    }
  }
  return {
    status: typeof data.status === "string" ? data.status.toUpperCase() : "UNKNOWN",
    amount: Number(data.amount ?? 0),
    transactionId: String(data.transaction_id ?? ""),
    method: String(data.payment_method ?? ""),
    depositId: String((metadata as { deposit_id?: unknown } | null)?.deposit_id ?? ""),
  };
}
