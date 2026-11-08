import { CheckCircle2, CircleCheck, CircleX, FolderKanban, Mail, Wrench, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdminPage } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ContactMessage } from "@/models/ContactMessage";
import { Project } from "@/models/Project";
import { Server } from "@/models/Server";
import { Service } from "@/models/Service";

export const metadata: Metadata = { title: "Dashboard" };

async function Stats() {
  await requireAdminPage();
  await connectToDatabase();
  const [projects, published, services, online, offline, messages, unread] = await Promise.all([
    Project.countDocuments(),
    Project.countDocuments({ status: "published" }),
    Service.countDocuments(),
    Server.countDocuments({ status: "online" }),
    Server.countDocuments({ status: "offline" }),
    ContactMessage.countDocuments(),
    ContactMessage.countDocuments({ read: false }),
  ]);

  const tiles: Array<{
    label: string;
    value: number;
    href: string;
    icon: LucideIcon;
    iconClass: string;
    note?: string;
  }> = [
    { label: "Total Projects", value: projects, href: "/admin/projects", icon: FolderKanban, iconClass: "text-primary" },
    { label: "Published Projects", value: published, href: "/admin/projects", icon: CheckCircle2, iconClass: "text-primary" },
    { label: "Total Services", value: services, href: "/admin/services", icon: Wrench, iconClass: "text-primary" },
    { label: "Online Servers", value: online, href: "/admin/servers", icon: CircleCheck, iconClass: "text-status-online" },
    { label: "Offline Servers", value: offline, href: "/admin/servers", icon: CircleX, iconClass: "text-status-offline" },
    {
      label: "Total Messages",
      value: messages,
      href: "/admin/messages",
      icon: Mail,
      iconClass: "text-primary",
      note: unread > 0 ? `${unread} unread` : undefined,
    },
  ];

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map(({ label, value, href, icon: Icon, iconClass, note }) => (
        <li key={label}>
          <Link href={href} className="admin-card flex h-full items-center justify-between gap-4 p-5 transition hover:border-primary/60">
            <div>
              <p className="text-sm text-admin-muted">{label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
              {note && <p className="mt-0.5 text-xs text-admin-muted">{note}</p>}
            </div>
            <Icon aria-hidden className={`size-7 shrink-0 ${iconClass}`} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-semibold">Dashboard</h1>
      <p className="mb-6 text-sm text-admin-muted">An overview of your website content.</p>
      <Suspense
        fallback={
          <div role="status" aria-label="Loading statistics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-28 rounded-xl" />
            ))}
          </div>
        }
      >
        <Stats />
      </Suspense>
    </>
  );
}
