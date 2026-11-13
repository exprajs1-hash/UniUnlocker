import "server-only";

/**
 * Client for the GSM-THEME reseller API, which follows the DHRU Fusion format:
 * a form POST with `username`, `apiaccesskey`, `action` and, for orders, an XML
 * `parameters` block. Every reply is `{ SUCCESS: [...] }` or `{ ERROR: [...] }`.
 */

const TIMEOUT_MS = 25_000;

/** The provider answered and refused the request (bad input, no credit, unknown order…). */
export class ProviderRejectedError extends Error {}

/**
 * The request may or may not have reached the provider (timeout, network
 * failure, unreadable reply). For orders this means "outcome unknown".
 */
export class ProviderUnavailableError extends Error {}

function config() {
  const url = process.env.GSM_API_URL;
  const username = process.env.GSM_API_USERNAME;
  const key = process.env.GSM_API_KEY;
  if (!url || !username || !key) {
    throw new ProviderUnavailableError("The rent provider is not configured (GSM_API_URL, GSM_API_USERNAME, GSM_API_KEY).");
  }
  return { url, username, key };
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => `&#${char.charCodeAt(0)};`);
}

type ProviderReply = { SUCCESS?: Record<string, unknown>[]; ERROR?: { MESSAGE?: unknown }[] };

function errorText(message: unknown): string {
  if (typeof message === "string") return message;
  if (message && typeof message === "object") {
    return Object.values(message as Record<string, unknown>)
      .flat()
      .map(String)
      .join(" ");
  }
  return "The provider rejected the request.";
}

async function call(action: string, parameters?: string): Promise<Record<string, unknown>> {
  const { url, username, key } = config();
  const body = new URLSearchParams({ username, apiaccesskey: key, action, requestformat: "JSON" });
  if (parameters) body.set("parameters", parameters);

  let reply: ProviderReply;
  try {
    const response = await fetch(url, {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    reply = (await response.json()) as ProviderReply;
  } catch (error) {
    throw new ProviderUnavailableError(`Could not reach the rent provider: ${(error as Error).message}`);
  }

  if (reply.ERROR?.length) throw new ProviderRejectedError(errorText(reply.ERROR[0]?.MESSAGE));
  const success = reply.SUCCESS?.[0];
  if (!success) throw new ProviderUnavailableError("The rent provider sent an unexpected reply.");
  return success;
}

export interface ProviderAccount {
  credit: number;
  currency: string;
}

export async function getProviderAccount(): Promise<ProviderAccount> {
  const result = await call("accountinfo");
  const info = (result.AccountInfo ?? {}) as { creditraw?: unknown; currency?: unknown };
  return { credit: Number(info.creditraw) || 0, currency: String(info.currency ?? "USD") };
}

export interface ProviderCustomField {
  name: string;
  type: string;
  options: string[];
  required: boolean;
}

export interface ProviderService {
  serviceId: number;
  name: string;
  group: string;
  type: string;
  costUsd: number;
  deliveryTime: string;
  info: string;
  customFields: ProviderCustomField[];
}

interface RawService {
  SERVICEID: number | string;
  SERVICETYPE?: string;
  SERVICENAME?: string;
  CREDIT?: number | string;
  TIME?: string;
  INFO?: string;
  "Requires.Custom"?: { fieldname?: string; fieldtype?: string; fieldoptions?: string; required?: string }[];
}

export async function listProviderServices(): Promise<ProviderService[]> {
  const result = await call("imeiservicelist");
  const groups = (result.LIST ?? {}) as Record<string, { GROUPNAME?: string; SERVICES?: Record<string, RawService> }>;
  const services: ProviderService[] = [];
  for (const [groupKey, group] of Object.entries(groups)) {
    for (const raw of Object.values(group.SERVICES ?? {})) {
      const serviceId = Number(raw.SERVICEID);
      if (!Number.isInteger(serviceId)) continue;
      services.push({
        serviceId,
        name: String(raw.SERVICENAME ?? "").trim(),
        group: String(group.GROUPNAME ?? groupKey).trim(),
        type: String(raw.SERVICETYPE ?? "").trim(),
        costUsd: Number(raw.CREDIT) || 0,
        deliveryTime: String(raw.TIME ?? "").trim(),
        info: String(raw.INFO ?? "").trim(),
        customFields: (raw["Requires.Custom"] ?? [])
          .filter((field) => field.fieldname)
          .map((field) => ({
            name: String(field.fieldname).trim(),
            type: String(field.fieldtype ?? "text"),
            options: String(field.fieldoptions ?? "")
              .split(",")
              .map((option) => option.trim())
              .filter(Boolean),
            required: field.required === "on",
          })),
      });
    }
  }
  return services;
}

/** Places an order and returns the provider's reference id. */
export async function placeProviderOrder(serviceId: number, fields: Record<string, string>): Promise<string> {
  let parameters = `<PARAMETERS><ID>${serviceId}</ID><QNT>1</QNT>`;
  if (Object.keys(fields).length > 0) {
    const encoded = Buffer.from(JSON.stringify(fields), "utf8").toString("base64");
    parameters += `<CUSTOMFIELD>${escapeXml(encoded)}</CUSTOMFIELD>`;
  }
  parameters += "</PARAMETERS>";

  const result = await call("placeimeiorder", parameters);
  const reference = result.REFERENCEID ?? result.ID;
  if (reference === undefined || reference === null || reference === "") {
    // Accepted but without an id: we cannot track it, so treat the outcome as unknown.
    throw new ProviderUnavailableError("The provider accepted the order but returned no reference id.");
  }
  return String(reference);
}

export type ProviderOrderState = "pending" | "processing" | "completed" | "rejected";

export interface ProviderOrderStatus {
  state: ProviderOrderState;
  /** The delivered result (login, code, message), as plain text. */
  result: string;
}

/** Strips the HTML the provider sometimes puts in results, keeping line breaks. */
export function providerTextToPlain(value: unknown): string {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** DHRU status codes: 0 new, 1 in process, 3 rejected, 4 completed. */
export async function getProviderOrder(referenceId: string): Promise<ProviderOrderStatus> {
  const result = await call("getimeiorder", `<PARAMETERS><ID>${escapeXml(referenceId)}</ID></PARAMETERS>`);
  const status = String(result.STATUS ?? "");
  const code = providerTextToPlain(result.CODE);
  switch (status) {
    case "4":
      return { state: "completed", result: code };
    case "3":
      return { state: "rejected", result: code };
    case "1":
      return { state: "processing", result: code };
    default:
      return { state: "pending", result: code };
  }
}
