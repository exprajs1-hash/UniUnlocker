import "server-only";
import { fetch as undiciFetch, ProxyAgent } from "undici";

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

export interface ProviderCredentials {
  url: string;
  username: string;
  key: string;
  /** Send this provider's calls through PROVIDER_PROXY_URL (a fixed-IP proxy the provider has whitelisted). */
  useProxy?: boolean;
}

let proxyAgent: ProxyAgent | null = null;

function getProxyAgent(): ProxyAgent {
  const proxyUrl = process.env.PROVIDER_PROXY_URL?.trim();
  if (!proxyUrl) throw new ProviderUnavailableError("This provider is set to use the proxy, but PROVIDER_PROXY_URL is not set.");
  proxyAgent ??= new ProxyAgent(proxyUrl);
  return proxyAgent;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => `&#${char.charCodeAt(0)};`);
}

type ProviderReply = { SUCCESS?: unknown; ERROR?: unknown; ID?: unknown };

/** DHRU panels differ: SUCCESS/ERROR may be an array, an object keyed "0", or the record itself. */
function firstRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return value[0] && typeof value[0] === "object" ? (value[0] as Record<string, unknown>) : null;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record["0"] && typeof record["0"] === "object") return record["0"] as Record<string, unknown>;
  return Object.keys(record).length > 0 ? record : null;
}

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

async function call(
  credentials: ProviderCredentials,
  action: string,
  parameters?: string,
  /** Extra top-level form fields, for panels that read values outside `parameters`. */
  extra: Record<string, string> = {},
): Promise<Record<string, unknown>> {
  const { url, username, key, useProxy } = credentials;
  if (!url || !username || !key) throw new ProviderUnavailableError("This provider is missing its API URL, username or key.");
  const body = new URLSearchParams({ ...extra, username, apiaccesskey: key, action, requestformat: "JSON" });
  if (parameters) body.set("parameters", parameters);
  const dispatcher = useProxy ? getProxyAgent() : undefined;

  let reply: ProviderReply;
  try {
    const response = dispatcher
      ? await undiciFetch(url, { method: "POST", body, dispatcher, signal: AbortSignal.timeout(TIMEOUT_MS) })
      : await fetch(url, { method: "POST", body, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
    reply = (await response.json()) as ProviderReply;
  } catch (error) {
    throw new ProviderUnavailableError(`Could not reach the rent provider: ${(error as Error).message}`);
  }

  const error = firstRecord(reply?.ERROR);
  if (error) throw new ProviderRejectedError(errorText(error.MESSAGE ?? error.message));
  const success = firstRecord(reply?.SUCCESS);
  if (!success) {
    const preview = JSON.stringify(reply ?? null).slice(0, 200);
    throw new ProviderUnavailableError(`The rent provider sent an unexpected reply: ${preview}`);
  }
  // Some panels put ID next to SUCCESS rather than inside it.
  if (success.ID === undefined && reply.ID !== undefined) return { ...success, ID: reply.ID };
  return success;
}

export interface ProviderAccount {
  credit: number;
  currency: string;
}

export async function getProviderAccount(credentials: ProviderCredentials): Promise<ProviderAccount> {
  const result = await call(credentials, "accountinfo");
  const info = (result.AccountInfo ?? {}) as { creditraw?: unknown; currency?: unknown };
  return { credit: Number(info.creditraw) || 0, currency: String(info.currency ?? "USD") };
}

export interface ProviderCustomField {
  name: string;
  type: string;
  options: string[];
  required: boolean;
  /** The provider's IMEI/main input: sent as <IMEI>, not inside CUSTOMFIELD. */
  imei?: boolean;
}

/** The IMEI/main input a service asks for, from the provider's CUSTOM block ("allow": "1"). */
function imeiField(custom: unknown): ProviderCustomField | null {
  if (!custom || typeof custom !== "object" || Array.isArray(custom)) return null;
  const block = custom as { allow?: unknown; customname?: unknown };
  if (String(block.allow ?? "") !== "1") return null;
  return { name: String(block.customname ?? "").trim() || "IMEI", type: "text", options: [], required: true, imei: true };
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
  /** Order quantity limits. Services the provider does not sell by quantity are fixed at 1. */
  minQuantity: number;
  maxQuantity: number;
}

interface RawService {
  SERVICEID: number | string;
  SERVICETYPE?: string;
  SERVICENAME?: string;
  CREDIT?: number | string;
  TIME?: string;
  INFO?: string;
  /** "1" when the service is sold by quantity; MINQNT/MAXQNT then give the limits. */
  QNT?: number | string;
  MINQNT?: number | string;
  MAXQNT?: number | string;
  /** IMEI input settings: { allow: "1", customname: "IMEI", ... } when the service takes one. */
  CUSTOM?: unknown;
  /** Usually an array; some providers send "" when there are none, or an object keyed by index. */
  "Requires.Custom"?: unknown;
}

type RawCustomField = { fieldname?: unknown; fieldtype?: unknown; fieldoptions?: unknown; required?: unknown };

function rawCustomFields(value: unknown): RawCustomField[] {
  const list = Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];
  return list.filter((field): field is RawCustomField => Boolean(field) && typeof field === "object");
}

/** Reads a cost like 1.5, "1.50", "$1.50" or "1,250.00". Unreadable values become 0, which blocks ordering. */
function parseCredit(value: unknown): number {
  const amount = Number.parseFloat(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

const MAX_QUANTITY = 1000;

function quantityLimits(raw: RawService): { minQuantity: number; maxQuantity: number } {
  if (String(raw.QNT ?? "") !== "1") return { minQuantity: 1, maxQuantity: 1 };
  const toInt = (value: unknown) => Math.floor(Number(value));
  const min = Math.min(Math.max(toInt(raw.MINQNT) || 1, 1), MAX_QUANTITY);
  const max = Math.min(Math.max(toInt(raw.MAXQNT) || min, min), MAX_QUANTITY);
  return { minQuantity: min, maxQuantity: max };
}

export async function listProviderServices(credentials: ProviderCredentials): Promise<ProviderService[]> {
  const result = await call(credentials, "imeiservicelist");
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
        costUsd: parseCredit(raw.CREDIT),
        deliveryTime: String(raw.TIME ?? "").trim(),
        info: String(raw.INFO ?? "").trim(),
        ...quantityLimits(raw),
        customFields: [
          ...[imeiField(raw.CUSTOM)].filter((field): field is ProviderCustomField => field !== null),
          ...rawCustomFields(raw["Requires.Custom"])
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
        ].filter((field, index, all) => all.findIndex((other) => other.name === field.name) === index),
      });
    }
  }
  return services;
}

/** Places an order and returns the provider's reference id. */
export async function placeProviderOrder(
  credentials: ProviderCredentials,
  serviceId: number,
  fields: Record<string, string>,
  quantity = 1,
  imei = "",
): Promise<string> {
  let parameters = `<PARAMETERS><ID>${serviceId}</ID>`;
  // DHRU panels refuse an order with neither an IMEI nor a custom field ("Missing IMEI or service input").
  if (imei) parameters += `<IMEI>${escapeXml(imei)}</IMEI>`;
  parameters += `<QNT>${quantity}</QNT>`;
  if (Object.keys(fields).length > 0) {
    const encoded = Buffer.from(JSON.stringify(fields), "utf8").toString("base64");
    parameters += `<CUSTOMFIELD>${escapeXml(encoded)}</CUSTOMFIELD>`;
  }
  parameters += "</PARAMETERS>";

  const result = await call(credentials, "placeimeiorder", parameters);
  const reference = result.REFERENCEID ?? result.ID;
  if (reference === undefined || reference === null || reference === "") {
    // Accepted but without an id: we cannot track it, so treat the outcome as unknown.
    throw new ProviderUnavailableError("The provider accepted the order but returned no reference id.");
  }
  return String(reference);
}

import { parseProviderState, type ProviderOrderState } from "@/lib/provider-state";
export { parseProviderState, type ProviderOrderState };

export interface ProviderOrderStatus {
  state: ProviderOrderState;
  /** The delivered result (login, code, message), as plain text. */
  result: string;
  /** The status value exactly as the provider sent it, shown to the admin. */
  raw: string;
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

/** Case-insensitive field lookup, since panels disagree on STATUS vs status. */
function pick(record: Record<string, unknown>, ...names: string[]): unknown {
  for (const name of names) {
    const key = Object.keys(record).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
    if (key !== undefined && record[key] !== undefined && record[key] !== null && record[key] !== "") return record[key];
  }
  return undefined;
}

/** A result may arrive as text/HTML or as an object such as { username, password }. */
function resultText(value: unknown): string {
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => (Array.isArray(value) ? providerTextToPlain(item) : `${key}: ${providerTextToPlain(item)}`))
      .join("\n");
  }
  return providerTextToPlain(value);
}

/** Maps a provider status (DHRU code or a word some panels send) to ours. Unknown values stay pending. */

type StatusRequest = { parameters: string; extra?: Record<string, string> };

/**
 * Ways panels expect the order id on "getimeiorder". Standard DHRU first; some
 * GSM-THEME panels answer "Missing Order ID" to it, so the others are tried next.
 */
function statusRequests(referenceId: string): StatusRequest[] {
  const id = escapeXml(referenceId);
  const fields = { id: referenceId, ID: referenceId, orderid: referenceId, ORDERID: referenceId, order_id: referenceId };
  return [
    { parameters: `<PARAMETERS><ID>${id}</ID></PARAMETERS>` },
    {
      parameters: `<PARAMETERS><ID>${id}</ID><ORDERID>${id}</ORDERID><REFERENCEID>${id}</REFERENCEID></PARAMETERS>`,
      extra: fields,
    },
    { parameters: JSON.stringify({ ID: referenceId, ORDERID: referenceId, REFERENCEID: referenceId }), extra: fields },
    { parameters: Buffer.from(`<PARAMETERS><ID>${id}</ID></PARAMETERS>`, "utf8").toString("base64"), extra: fields },
  ];
}

/** Which status request format each provider URL accepted, so later checks go straight to it. */
const workingStatusRequest = new Map<string, number>();

const MISSING_INPUT = /missing|required|not (found|provided)|empty/i;

/** DHRU status codes: 0 new, 1 in process, 3 rejected, 4 completed. */
export async function getProviderOrder(credentials: ProviderCredentials, referenceId: string): Promise<ProviderOrderStatus> {
  const requests = statusRequests(referenceId);
  const known = workingStatusRequest.get(credentials.url);
  const order = known === undefined ? requests.map((_, index) => index) : [known, ...requests.map((_, index) => index).filter((index) => index !== known)];

  let result: Record<string, unknown> | null = null;
  let lastError: unknown = null;
  for (const index of order) {
    try {
      result = await call(credentials, "getimeiorder", requests[index].parameters, requests[index].extra);
      if (known !== index) {
        workingStatusRequest.set(credentials.url, index);
        if (index > 0) console.log(`[rent] ${credentials.url} accepted status request format #${index + 1}`);
      }
      break;
    } catch (error) {
      lastError = error;
      // Only an "input missing" refusal means the format was wrong; anything else is a real answer.
      if (!(error instanceof ProviderRejectedError) || !MISSING_INPUT.test(error.message)) throw error;
    }
  }
  if (!result) {
    throw new ProviderRejectedError(`${(lastError as Error).message} (tried ${requests.length} request formats)`);
  }

  const raw = String(pick(result, "STATUS", "ORDERSTATUS") ?? "");
  const code = resultText(pick(result, "CODE", "RESULT", "COMMENTS"));
  return { state: parseProviderState(raw), result: code, raw };
}
