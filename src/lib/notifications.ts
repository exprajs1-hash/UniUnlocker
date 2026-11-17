import "server-only";
import { after } from "next/server";
import { getSettings } from "@/lib/data";
import { sendMail, smtpConfigured } from "@/lib/mailer";
import { formatTaka } from "@/lib/money";
import { connectToDatabase } from "@/lib/mongodb";
import { SITE_URL } from "@/lib/seo";
import { Customer } from "@/models/Customer";
import { RentOrder } from "@/models/RentOrder";

/**
 * Emails to customers (balance added, order receipt, order finished) and to the
 * admin (new custom order). Sent after the response, and a failed email never
 * breaks the action that triggered it.
 */

const HIDDEN = "••••••";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

type Row = [label: string, value: string];

/** Plain, readable layout that works in every mail app (tables, inline styles). */
function layout(siteName: string, heading: string, intro: string, rows: Row[], extra = "", button?: { label: string; href: string }) {
  const rowHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top;width:40%">${escapeHtml(label)}</td><td style="padding:8px 0;font-size:14px;font-weight:600;white-space:pre-wrap;word-break:break-word">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f3f6fb;font-family:Poppins,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px">
<tr><td style="font-size:20px;font-weight:700;color:#1d4ed8">${escapeHtml(siteName)}</td></tr>
<tr><td style="padding-top:16px;font-size:18px;font-weight:700">${escapeHtml(heading)}</td></tr>
<tr><td style="padding-top:8px;font-size:15px;line-height:1.6">${escapeHtml(intro)}</td></tr>
<tr><td style="padding-top:12px"><table role="presentation" width="100%" style="border-top:1px solid #e2e8f0">${rowHtml}</table></td></tr>
${extra ? `<tr><td style="padding-top:12px;font-size:14px;line-height:1.6;white-space:pre-wrap;background:#f1f5f9;border-radius:10px;padding:14px;font-family:Consolas,monospace">${escapeHtml(extra)}</td></tr>` : ""}
${button ? `<tr><td style="padding-top:20px"><a href="${escapeHtml(button.href)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">${escapeHtml(button.label)}</a></td></tr>` : ""}
</table></body></html>`;
  const text = [heading, "", intro, "", ...rows.map(([label, value]) => `${label}: ${value}`), ...(extra ? ["", extra] : []), ...(button ? ["", `${button.label}: ${button.href}`] : [])].join("\n");
  return { html, text };
}

/** Runs after the response when possible; email problems are only logged. */
function later(label: string, task: () => Promise<void>): void {
  const run = () => task().catch((error) => console.error(`[notify] ${label} failed:`, error));
  try {
    after(run);
  } catch {
    // Outside a request (e.g. a script): just run it.
    void run();
  }
}

async function siteName(): Promise<string> {
  return (await getSettings()).siteName || "UniUnlocker";
}

const orderNumber = (id: string) => `#${id.slice(-6).toUpperCase()}`;

/** Customer: the admin added balance (e.g. after a bKash payment). */
export function notifyDeposit(customerId: string, amount: number, balance: number, note: string): void {
  later("deposit email", async () => {
    await connectToDatabase();
    const customer = await Customer.findById(customerId, { name: 1, email: 1 }).lean();
    if (!customer?.email) return;
    const name = await siteName();
    const { html, text } = layout(
      name,
      `${formatTaka(amount)} added to your balance`,
      `Hi ${customer.name}, your deposit has been added to your ${name} balance.`,
      [
        ["Amount added", formatTaka(amount)],
        ["New balance", formatTaka(balance)],
        ...(note ? ([["Note", note]] as Row[]) : []),
        ["Date", new Date().toUTCString()],
      ],
      "",
      { label: "Open my account", href: `${SITE_URL}/account` },
    );
    await sendMail({ to: customer.email, subject: `${formatTaka(amount)} added to your ${name} balance`, text, html });
  });
}

/** Customer: receipt for a new order. Admin: a custom order needs doing. */
export function notifyOrderPlaced(orderId: string): void {
  later("order email", async () => {
    await connectToDatabase();
    const order = await RentOrder.findById(orderId).lean();
    if (!order) return;
    const customer = await Customer.findById(order.customer, { name: 1, email: 1, balance: 1 }).lean();
    const name = await siteName();
    const secret = new Set(order.sensitiveFields ?? []);
    const fieldRows: Row[] = Object.entries(order.fields ?? {}).map(([field, value]) => [field, secret.has(field) ? HIDDEN : String(value)]);
    const rows: Row[] = [
      ["Order", orderNumber(String(order._id))],
      ["Service", order.serviceName],
      ...(order.quantity > 1 ? ([["Quantity", String(order.quantity)]] as Row[]) : []),
      ["Price", formatTaka(order.priceBdt)],
      ...fieldRows,
      ...(customer ? ([["Balance left", formatTaka(customer.balance)]] as Row[]) : []),
    ];
    const link = `${SITE_URL}/account/orders/${String(order._id)}`;

    if (customer?.email && order.notifiedStatus !== "placed") {
      const { html, text } = layout(
        name,
        "Order confirmed",
        `Hi ${customer.name}, we received your order. We will email you again when it is ready.`,
        rows,
        "",
        { label: "View order", href: link },
      );
      await sendMail({ to: customer.email, subject: `Order ${orderNumber(String(order._id))} confirmed: ${order.serviceName}`, text, html });
      await RentOrder.updateOne({ _id: order._id, notifiedStatus: "" }, { $set: { notifiedStatus: "placed" } });
    }

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL;
    if (order.manual && adminEmail) {
      // Secrets (e.g. a remote-access password) stay out of email, which is kept forever:
      // the admin reads them in Rent Orders, and they are hidden there once the order is finished.
      const adminRows: Row[] = [
        ...rows.filter(([label]) => label !== "Balance left").map(([label, value]): Row => [label, value === HIDDEN ? "(open Rent Orders to see)" : value]),
        ["Customer", customer ? `${customer.name} (${customer.email})` : "Unknown"],
      ];
      const { html, text } = layout(name, "New custom order", "A customer placed a custom order. Do the job, then complete or reject it in Rent Orders.", adminRows, "", {
        label: "Open Rent Orders",
        href: `${SITE_URL}/admin/rent-orders`,
      });
      await sendMail({ to: adminEmail, subject: `New custom order: ${order.serviceName}`, text, html });
    }
  });
}

/** Customer: the order is finished (result) or rejected (refund). Sent once per outcome. */
export function notifyOrderFinished(orderId: string): void {
  later("order finished email", async () => {
    await connectToDatabase();
    const current = await RentOrder.findById(orderId, { status: 1 }).lean();
    if (!current || !["completed", "rejected", "failed"].includes(current.status)) return;
    // Claim this email atomically, so parallel status checks send it only once.
    const order = await RentOrder.findOneAndUpdate(
      { _id: orderId, status: current.status, notifiedStatus: { $ne: current.status } },
      { $set: { notifiedStatus: current.status } },
      { returnDocument: "after" },
    ).lean();
    if (!order) return;
    const customer = await Customer.findById(order.customer, { name: 1, email: 1, balance: 1 }).lean();
    if (!customer?.email || !smtpConfiguredOrDev()) return;
    const name = await siteName();
    const done = order.status === "completed";
    const rows: Row[] = [
      ["Order", orderNumber(String(order._id))],
      ["Service", order.serviceName],
      ["Price", formatTaka(order.priceBdt)],
      ...(order.refunded ? ([["Refunded", formatTaka(order.priceBdt)]] as Row[]) : []),
      ["Balance", formatTaka(customer.balance)],
    ];
    const { html, text } = layout(
      name,
      done ? "Your order is ready" : "Your order could not be completed",
      done
        ? `Hi ${customer.name}, your order is complete. Your details are below and in your account.`
        : `Hi ${customer.name}, unfortunately this order could not be completed.${order.refunded ? " The full amount was returned to your balance." : ""}`,
      rows,
      order.result || "",
      { label: "View order", href: `${SITE_URL}/account/orders/${String(order._id)}` },
    );
    await sendMail({
      to: customer.email,
      subject: done ? `Ready: ${order.serviceName} (${orderNumber(String(order._id))})` : `Not completed: ${order.serviceName} (${orderNumber(String(order._id))})`,
      text,
      html,
    });
  });
}

/** In development without SMTP, sendMail prints the email instead; in production it needs SMTP. */
function smtpConfiguredOrDev(): boolean {
  return smtpConfigured() || process.env.NODE_ENV !== "production";
}
