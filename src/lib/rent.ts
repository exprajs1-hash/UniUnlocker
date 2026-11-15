import "server-only";
import { Types } from "mongoose";
import { ApiError } from "@/lib/api";
import {
  getProviderOrder,
  placeProviderOrder,
  ProviderRejectedError,
  ProviderUnavailableError,
} from "@/lib/gsm-api";
import { connectToDatabase } from "@/lib/mongodb";
import { getProviderCredentials } from "@/lib/providers";
import { DEFAULT_USD_TO_BDT } from "@/lib/pricing";
import { serialize } from "@/lib/serialize";
import { BalanceTransaction } from "@/models/BalanceTransaction";
import { Customer } from "@/models/Customer";
import { Provider } from "@/models/Provider";
import { RentConfig } from "@/models/RentConfig";
import { RentOrder, type IRentOrder } from "@/models/RentOrder";
import { RentService, type IRentService } from "@/models/RentService";
import { WebsiteSettings } from "@/models/WebsiteSettings";
import type {
  AdminRentServiceDTO,
  BalanceTransactionType,
  ManualOrderStatus,
  PublicRentServiceDTO,
  RentConfigDTO,
  RentLastOrderDTO,
  RentOrderDTO,
  RentOrderStatus,
} from "@/types";

/* ------------------------------------------------------------------ pricing */

export interface Pricing {
  rate: number;
  markupPercent: number;
  ordersEnabled: boolean;
}

export async function getPricing(): Promise<Pricing> {
  await connectToDatabase();
  const [settings, config] = await Promise.all([
    WebsiteSettings.findOne({ key: "singleton" }, { usdToBdtRate: 1 }).lean(),
    RentConfig.findOne({ key: "singleton" }).lean(),
  ]);
  return {
    rate: settings?.usdToBdtRate && settings.usdToBdtRate > 0 ? settings.usdToBdtRate : DEFAULT_USD_TO_BDT,
    markupPercent: config?.markupPercent ?? 20,
    ordersEnabled: config?.ordersEnabled ?? true,
  };
}

export function toRentConfigDTO(pricing: Pricing): RentConfigDTO {
  return { markupPercent: pricing.markupPercent, ordersEnabled: pricing.ordersEnabled };
}

/** The admin's fixed price, or cost × rate + markup rounded up to whole taka. */
export function effectivePrice(service: Pick<IRentService, "priceBdt" | "costUsd">, pricing: Pricing): number {
  if (service.priceBdt !== null && service.priceBdt !== undefined) return service.priceBdt;
  return Math.ceil(service.costUsd * pricing.rate * (1 + pricing.markupPercent / 100));
}

type ServiceDoc = IRentService & { _id: unknown };

export function toPublicService(doc: ServiceDoc, pricing: Pricing): PublicRentServiceDTO {
  return {
    id: String(doc._id),
    name: doc.title || doc.name,
    group: doc.group,
    deliveryTime: doc.deliveryTime,
    info: doc.description ?? "",
    priceBdt: effectivePrice(doc, pricing),
    customFields: doc.customFields ?? [],
    minQuantity: doc.minQuantity ?? 1,
    maxQuantity: doc.maxQuantity ?? 1,
  };
}

export function toAdminService(
  doc: ServiceDoc,
  pricing: Pricing,
  providerNames: Map<string, string>,
  lastOrder: RentLastOrderDTO | null = null,
): AdminRentServiceDTO {
  return {
    ...serialize<AdminRentServiceDTO>(doc),
    lastOrder,
    description: doc.description ?? "",
    provider: String(doc.provider),
    providerName: providerNames.get(String(doc.provider)) ?? "Deleted provider",
    effectivePriceBdt: effectivePrice(doc, pricing),
  };
}

/** Provider id → name, for labelling services and orders in the admin panel. */
export async function providerNameMap(): Promise<Map<string, string>> {
  const providers = await Provider.find({}, { name: 1 }).lean();
  return new Map(providers.map((provider) => [String(provider._id), provider.name]));
}

/* ------------------------------------------------------------------- wallet */

/**
 * Adds (positive) or deducts (negative) whole taka atomically. A deduction
 * only succeeds when the balance covers it, so two parallel orders can never
 * take the balance below zero.
 */
export async function changeBalance(
  customerId: string,
  amount: number,
  type: BalanceTransactionType,
  note: string,
  orderId: Types.ObjectId | null = null,
): Promise<number> {
  if (!Number.isInteger(amount) || amount === 0) throw new ApiError(422, "The amount must be a whole, non-zero number.");
  await connectToDatabase();
  const filter = amount < 0 ? { _id: customerId, balance: { $gte: -amount } } : { _id: customerId };
  const customer = await Customer.findOneAndUpdate(filter, { $inc: { balance: amount } }, { returnDocument: "after" }).lean();
  if (!customer) {
    const exists = await Customer.exists({ _id: customerId });
    if (!exists) throw new ApiError(404, "Customer not found.");
    throw new ApiError(402, "Not enough balance.");
  }
  await BalanceTransaction.create({
    customer: customerId,
    type,
    amount,
    balanceAfter: customer.balance,
    note,
    order: orderId,
  });
  return customer.balance;
}

/**
 * Refunds an order once; a second call (or a race) does nothing. Completed
 * orders are skipped unless the admin is reversing one by hand.
 */
export async function refundOrder(
  orderId: string,
  status: RentOrderStatus,
  note: string,
  allowCompleted = false,
): Promise<boolean> {
  const order = await RentOrder.findOneAndUpdate(
    allowCompleted ? { _id: orderId, refunded: false } : { _id: orderId, refunded: false, status: { $ne: "completed" } },
    { $set: { refunded: true, status } },
    { returnDocument: "after" },
  ).lean();
  if (!order) return false;
  if (order.priceBdt > 0) {
    await changeBalance(String(order.customer), order.priceBdt, "refund", note, order._id as Types.ObjectId);
  }
  return true;
}

/* ------------------------------------------------------------------- orders */

export function toOrderDTO(doc: Omit<IRentOrder, "customer"> & { _id: unknown }): RentOrderDTO {
  return {
    id: String(doc._id),
    serviceName: doc.serviceName,
    quantity: doc.quantity ?? 1,
    priceBdt: doc.priceBdt,
    fields: doc.fields ?? {},
    status: doc.status,
    result: doc.result,
    refunded: doc.refunded,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

const MAX_FIELD_LENGTH = 300;

function cleanFields(service: IRentService, input: Record<string, unknown>): Record<string, string> {
  const fields: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const field of service.customFields ?? []) {
    const raw = input[field.name];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) {
      if (field.required) errors[field.name] = `${field.name} is required`;
      continue;
    }
    if (value.length > MAX_FIELD_LENGTH) errors[field.name] = `${field.name} is too long`;
    else if (field.options.length > 0 && !field.options.includes(value)) errors[field.name] = `Choose a valid ${field.name}`;
    else fields[field.name] = value;
  }
  if (Object.keys(errors).length > 0) {
    throw new ApiError(422, "Please check the highlighted fields.", undefined, errors);
  }
  return fields;
}

export interface PlaceOrderResult {
  order: RentOrderDTO;
  balance: number;
  message: string;
}

/**
 * Order flow: take the balance first (atomic, fails if too low), then call the
 * provider. A definite provider refusal is refunded straight away. If the
 * provider cannot be reached, the order stays "submitting" for the admin to
 * check, since it may still have gone through on the provider's side.
 */
export async function placeOrder(
  customerId: string,
  serviceId: string,
  input: Record<string, unknown>,
  quantity = 1,
): Promise<PlaceOrderResult> {
  const pricing = await getPricing();
  if (!pricing.ordersEnabled) throw new ApiError(503, "New rent orders are paused right now. Please try again later.");

  if (!Types.ObjectId.isValid(serviceId)) throw new ApiError(404, "This service is not available.");
  const service = await RentService.findOne({ _id: serviceId, enabled: true, availableOnProvider: true }).lean();
  if (!service) throw new ApiError(404, "This service is not available.");
  // Checked before any money moves: a disabled or deleted provider cannot take orders.
  const credentials = await getProviderCredentials(service.provider, true).catch(() => {
    throw new ApiError(404, "This service is not available.");
  });

  const fields = cleanFields(service, input);
  const minQuantity = service.minQuantity ?? 1;
  const maxQuantity = service.maxQuantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < minQuantity || quantity > maxQuantity) {
    const allowed = minQuantity === maxQuantity ? `${minQuantity}` : `${minQuantity}–${maxQuantity}`;
    throw new ApiError(422, "Please check the highlighted fields.", undefined, { quantity: `Quantity must be ${allowed}` });
  }
  const price = effectivePrice(service, pricing) * quantity;
  const serviceName = service.title || service.name;
  const orderId = new Types.ObjectId();

  let balance: number;
  if (price > 0) {
    try {
      balance = await changeBalance(customerId, -price, "order", serviceName, orderId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 402) {
        throw new ApiError(402, `Not enough balance. This rent costs ৳${price}. Please ask the admin to add balance.`);
      }
      throw error;
    }
  } else {
    balance = (await Customer.findById(customerId, { balance: 1 }).lean())?.balance ?? 0;
  }

  const order = await RentOrder.create({
    _id: orderId,
    customer: customerId,
    provider: service.provider,
    serviceId: service.serviceId,
    serviceName,
    quantity,
    priceBdt: price,
    costUsd: service.costUsd * quantity,
    fields,
    status: "submitting",
  });

  try {
    // The IMEI field goes in <IMEI>; the rest in CUSTOMFIELD. A service with no input at all
    // still needs one of them, so our order id stands in as the IMEI (server services ignore it).
    const imeiName = (service.customFields ?? []).find((field) => field.imei)?.name;
    const customFields = { ...fields };
    let imei = "";
    if (imeiName && fields[imeiName]) {
      imei = fields[imeiName];
      delete customFields[imeiName];
    }
    if (!imei && Object.keys(customFields).length === 0) imei = String(orderId);
    const reference = await placeProviderOrder(credentials, service.serviceId, customFields, quantity, imei);
    order.providerOrderId = reference;
    order.status = "pending";
    await order.save();
    return { order: toOrderDTO(order.toObject()), balance, message: "Order placed. Your rent details will appear here shortly." };
  } catch (error) {
    if (error instanceof ProviderRejectedError) {
      order.adminNote = error.message;
      order.result = "The order could not be placed.";
      await order.save();
      await refundOrder(String(orderId), "failed", `Refund: ${serviceName}`);
      throw new ApiError(422, `This service could not be ordered right now. ${price > 0 ? `৳${price} was returned to your balance.` : ""}`.trim());
    }
    order.adminNote = error instanceof ProviderUnavailableError ? error.message : String(error);
    await order.save();
    console.error("[rent] Order outcome unknown", String(orderId), error);
    return {
      order: toOrderDTO(order.toObject()),
      balance,
      message: "Order received. We are confirming it with the provider; if it cannot be completed you will be refunded.",
    };
  }
}

/** Minimum gap between provider checks of one order; a little under the customer page's 10 s poll. */
const REFRESH_AFTER_MS = 8_000;

export type RefreshOutcome =
  | { checked: false; reason: "skipped" }
  | { checked: true; ok: true; state: RentOrderStatus; raw: string }
  | { checked: true; ok: false; error: string };

/**
 * Asks the provider for an update and applies it. Rejected orders are refunded.
 * A failed check is saved on the order so the admin can see why it is stuck.
 */
export async function refreshOrder(order: IRentOrder & { _id: unknown }, force = false): Promise<RefreshOutcome> {
  if (!["pending", "processing"].includes(order.status) || !order.providerOrderId) return { checked: false, reason: "skipped" };
  if (!force && order.lastCheckedAt && Date.now() - new Date(order.lastCheckedAt).getTime() < REFRESH_AFTER_MS) {
    return { checked: false, reason: "skipped" };
  }

  const id = String(order._id);
  await RentOrder.updateOne({ _id: id }, { $set: { lastCheckedAt: new Date() } });
  let status;
  try {
    const credentials = await getProviderCredentials(order.provider);
    status = await getProviderOrder(credentials, order.providerOrderId);
  } catch (error) {
    const message = (error as Error).message || String(error);
    console.error("[rent] Status check failed", id, message);
    await RentOrder.updateOne({ _id: id }, { $set: { checkError: message.slice(0, 500) } });
    return { checked: true, ok: false, error: message };
  }

  const open = { _id: id, status: { $in: ["pending", "processing"] as RentOrderStatus[] } };
  if (status.state === "rejected") {
    await RentOrder.updateOne(open, {
      $set: { result: status.result || "The order was rejected.", checkError: "", providerStatus: status.raw },
    });
    await refundOrder(id, "rejected", `Refund: ${order.serviceName}`);
  } else {
    await RentOrder.updateOne(open, {
      $set: { status: status.state, result: status.result, checkError: "", providerStatus: status.raw },
    });
  }
  return { checked: true, ok: true, state: status.state, raw: status.raw };
}

export interface ManualUpdate {
  status: ManualOrderStatus;
  result: string;
  /** Lets the admin attach the provider's order id to an order stuck in "submitting". */
  providerOrderId?: string;
  /** For rejected/failed: return the money to the customer. */
  refund: boolean;
}

/**
 * The admin sets an order's status and delivered result by hand, for when the
 * provider finished it but the automatic check did not pick it up (or the
 * delivery was done outside the provider). Pending/processing orders with a
 * provider id keep being checked automatically.
 */
export async function updateOrderManually(orderId: string, update: ManualUpdate): Promise<{ refunded: boolean }> {
  await connectToDatabase();
  const order = await RentOrder.findById(orderId).lean();
  if (!order) throw new ApiError(404, "Order not found.");

  const closing = update.status === "rejected" || update.status === "failed";
  if (order.refunded && !closing) {
    throw new ApiError(422, "This order was already refunded, so it cannot be reopened or completed. Place a new order instead.");
  }
  if (update.status === "completed" && !update.result.trim()) {
    throw new ApiError(422, "Please check the highlighted fields.", undefined, {
      result: "Enter what the customer receives (e.g. user ID and password).",
    });
  }
  const providerOrderId = update.providerOrderId?.trim() ?? order.providerOrderId;
  if ((update.status === "pending" || update.status === "processing") && order.status === "submitting" && !providerOrderId) {
    throw new ApiError(422, "Please check the highlighted fields.", undefined, {
      providerOrderId: "Enter the provider order id so the status can be checked automatically.",
    });
  }

  const now = new Date();
  const changes = {
    result: update.result.trim(),
    providerOrderId,
    manualAt: now,
    checkError: "",
    adminNote: [order.adminNote, `Set to "${update.status}" by admin on ${now.toISOString().slice(0, 16).replace("T", " ")} UTC.`]
      .filter(Boolean)
      .join("\n")
      .slice(-2000),
  };
  // Only applies if nothing (e.g. an automatic check) changed the order meanwhile.
  const guard = { _id: orderId, status: order.status, refunded: order.refunded };

  if (closing && update.refund && !order.refunded) {
    const saved = await RentOrder.updateOne(guard, { $set: changes });
    if (saved.matchedCount === 0) throw new ApiError(409, "This order just changed. Reload and try again.");
    const done = await refundOrder(orderId, update.status, `Refund: ${order.serviceName}`, true);
    if (!done) throw new ApiError(409, "This order was already refunded.");
    return { refunded: true };
  }

  const saved = await RentOrder.updateOne(guard, { $set: { ...changes, status: update.status } });
  if (saved.matchedCount === 0) throw new ApiError(409, "This order just changed. Reload and try again.");
  return { refunded: false };
}

/** Refreshes a few stale open orders, oldest check first, without failing the caller. */
export async function refreshOpenOrders(filter: Record<string, unknown>, limit = 5): Promise<void> {
  const open = await RentOrder.find({ ...filter, status: { $in: ["pending", "processing"] } })
    .sort({ lastCheckedAt: 1 })
    .limit(limit)
    .lean();
  await Promise.all(open.map((order) => refreshOrder(order).catch(() => undefined)));
}
