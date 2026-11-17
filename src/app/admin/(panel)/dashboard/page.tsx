import {
  AlertTriangle,
  ArrowRight,
  CircleCheck,
  CircleX,
  FolderKanban,
  Loader,
  Mail,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OrderStatusBadge } from "@/components/rent/shared";
import { RelativeTime } from "@/components/ui/relative-time";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdminPage } from "@/lib/auth";
import { formatTaka, roundMoney } from "@/lib/money";
import { connectToDatabase } from "@/lib/mongodb";
import { getPricing } from "@/lib/rent";
import { ContactMessage } from "@/models/ContactMessage";
import { Customer } from "@/models/Customer";
import { Project } from "@/models/Project";
import { RentOrder } from "@/models/RentOrder";
import { Server } from "@/models/Server";
import { Service } from "@/models/Service";
import type { RentOrderStatus } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };

/** Bangladesh time (UTC+6, no daylight saving): "today" and "this month" follow the shop's clock. */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

function startOfDhakaDay(now: Date): Date {
  const local = new Date(now.getTime() + DHAKA_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - DHAKA_OFFSET_MS);
}

function startOfDhakaMonth(now: Date): Date {
  const local = new Date(now.getTime() + DHAKA_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - DHAKA_OFFSET_MS);
}

/** Sales and provider cost of paid (not refunded, not failed) orders since a date. */
async function salesSince(since: Date, rate: number) {
  const rows = await RentOrder.aggregate<{ _id: string; sales: number; cost: number; count: number }>([
    { $match: { createdAt: { $gte: since }, refunded: false, status: { $nin: ["rejected", "failed"] } } },
    { $group: { _id: "$costCurrency", sales: { $sum: "$priceBdt" }, cost: { $sum: "$costUsd" }, count: { $sum: 1 } } },
  ]);
  let sales = 0;
  let cost = 0;
  let count = 0;
  for (const row of rows) {
    sales += row.sales;
    cost += row._id === "BDT" ? row.cost : row.cost * rate;
    count += row.count;
  }
  return { sales: roundMoney(sales), profit: roundMoney(sales - cost), count };
}

type Tile = { label: string; value: string; note?: string; href: string; icon: LucideIcon; tone: string; alert?: boolean };

function Tiles({ tiles, columns = "sm:grid-cols-2 lg:grid-cols-4" }: { tiles: Tile[]; columns?: string }) {
  return (
    <ul className={`grid gap-3 ${columns}`}>
      {tiles.map(({ label, value, note, href, icon: Icon, tone, alert }) => (
        <li key={label}>
          <Link
            href={href}
            className={`admin-card flex h-full items-start justify-between gap-3 p-4 transition hover:border-primary/60 ${
              alert ? "border-status-offline/60 bg-status-offline/5" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm text-admin-muted">{label}</p>
              <p className="mt-1 truncate text-2xl font-bold tabular-nums">{value}</p>
              {note && <p className="mt-0.5 text-xs text-admin-muted">{note}</p>}
            </div>
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon aria-hidden className="size-5" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function Business() {
  await requireAdminPage();
  await connectToDatabase();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const pricing = await getPricing();
  const [today, month, needAction, open, customers, newCustomers, balances, recent] = await Promise.all([
    salesSince(startOfDhakaDay(now), pricing.rate),
    salesSince(startOfDhakaMonth(now), pricing.rate),
    RentOrder.countDocuments({
      $or: [{ manual: true, status: { $in: ["pending", "processing"] } }, { status: "submitting" }],
    }),
    RentOrder.countDocuments({ status: { $in: ["pending", "processing"] } }),
    Customer.countDocuments(),
    Customer.countDocuments({ createdAt: { $gte: weekAgo } }),
    Customer.aggregate<{ total: number }>([{ $group: { _id: null, total: { $sum: "$balance" } } }]),
    RentOrder.find({}, { serviceName: 1, priceBdt: 1, status: 1, refunded: 1, createdAt: 1, manual: 1, customer: 1 })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate<{ customer: { name: string } | null }>("customer", "name")
      .lean(),
  ]);

  const tiles: Tile[] = [
    {
      label: "Sales today",
      value: formatTaka(today.sales),
      note: `${today.count} orders · profit ${formatTaka(today.profit)}`,
      href: "/admin/rent-orders",
      icon: TrendingUp,
      tone: "bg-status-online/15 text-status-online",
    },
    {
      label: "Sales this month",
      value: formatTaka(month.sales),
      note: `${month.count} orders · profit ${formatTaka(month.profit)}`,
      href: "/admin/rent-orders",
      icon: TrendingUp,
      tone: "bg-primary/15 text-primary",
    },
    {
      label: "Waiting for you",
      value: String(needAction),
      note: needAction > 0 ? "Custom orders to deliver or orders to check" : "Nothing to do",
      href: "/admin/rent-orders",
      icon: AlertTriangle,
      tone: needAction > 0 ? "bg-status-offline/15 text-status-offline" : "bg-admin-raised text-admin-muted",
      alert: needAction > 0,
    },
    {
      label: "Open orders",
      value: String(open),
      note: "Pending or processing",
      href: "/admin/rent-orders",
      icon: Loader,
      tone: "bg-status-maintenance/15 text-status-maintenance",
    },
    {
      label: "Customers",
      value: String(customers),
      note: `${newCustomers} new this week`,
      href: "/admin/customers",
      icon: Users,
      tone: "bg-primary/15 text-primary",
    },
    {
      label: "Customer balances",
      value: formatTaka(roundMoney(balances[0]?.total ?? 0)),
      note: "Money customers can still spend",
      href: "/admin/customers",
      icon: Wallet,
      tone: "bg-purple/15 text-purple",
    },
  ];

  return (
    <div className="space-y-6">
      <Tiles tiles={tiles} columns="sm:grid-cols-2 lg:grid-cols-3" />

      <section className="admin-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">Latest orders</h2>
          <Link href="/admin/rent-orders" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            All orders <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-admin-muted">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-admin-line">
            {recent.map((order) => (
              <li key={String(order._id)} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{order.serviceName}</p>
                  <p className="text-xs text-admin-muted">
                    {order.customer?.name ?? "Deleted customer"} · <RelativeTime iso={new Date(order.createdAt).toISOString()} />
                    {order.manual && " · Custom"}
                  </p>
                </div>
                <span className="font-semibold tabular-nums">{formatTaka(order.priceBdt)}</span>
                <OrderStatusBadge status={order.status as RentOrderStatus} refunded={order.refunded} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

async function Website() {
  await requireAdminPage();
  await connectToDatabase();
  const [projects, services, online, offline, unread] = await Promise.all([
    Project.countDocuments(),
    Service.countDocuments(),
    Server.countDocuments({ status: "online" }),
    Server.countDocuments({ status: "offline" }),
    ContactMessage.countDocuments({ read: false }),
  ]);
  const tiles: Tile[] = [
    { label: "Servers online", value: String(online), href: "/admin/servers", icon: CircleCheck, tone: "bg-status-online/15 text-status-online" },
    {
      label: "Servers offline",
      value: String(offline),
      href: "/admin/servers",
      icon: CircleX,
      tone: offline > 0 ? "bg-status-offline/15 text-status-offline" : "bg-admin-raised text-admin-muted",
    },
    { label: "Unread messages", value: String(unread), href: "/admin/messages", icon: Mail, tone: "bg-primary/15 text-primary" },
    { label: "Projects / services", value: `${projects} / ${services}`, href: "/admin/projects", icon: FolderKanban, tone: "bg-admin-raised text-admin-muted" },
  ];
  return <Tiles tiles={tiles} />;
}

function TilesSkeleton({ count, columns }: { count: number; columns: string }) {
  return (
    <div role="status" aria-label="Loading" className={`grid gap-3 ${columns}`}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-extrabold">Dashboard</h1>
      <p className="mb-6 text-sm text-admin-muted">Today at a glance. Times follow Bangladesh time.</p>
      <Suspense fallback={<TilesSkeleton count={6} columns="sm:grid-cols-2 lg:grid-cols-3" />}>
        <Business />
      </Suspense>
      <h2 className="mt-8 mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider text-admin-muted uppercase">
        <Wrench aria-hidden className="size-4" /> Website
      </h2>
      <Suspense fallback={<TilesSkeleton count={4} columns="sm:grid-cols-2 lg:grid-cols-4" />}>
        <Website />
      </Suspense>
    </>
  );
}
