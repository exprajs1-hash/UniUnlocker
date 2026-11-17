"use client";

import {
  ExternalLink,
  FolderKanban,
  GalleryHorizontal,
  Hammer,
  Handshake,
  Info,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  Server,
  Settings,
  ShoppingCart,
  Users,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { OnlineToggle } from "@/components/admin/online-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/components/ui/toast";
import { apiFetch, errorMessage } from "@/lib/client-api";

type Badge = "orders" | "messages";

/** Grouped so the daily work (orders, customers) is on top and site content below. */
const NAV: Array<{ title: string; links: Array<{ href: string; label: string; icon: typeof Server; badge?: Badge }> }> = [
  {
    title: "Business",
    links: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/rent-orders", label: "Orders", icon: ShoppingCart, badge: "orders" },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/rent-services", label: "Rent services", icon: Package },
    ],
  },
  {
    title: "Website",
    links: [
      { href: "/admin/servers", label: "Servers", icon: Server },
      { href: "/admin/tools", label: "Tools", icon: Hammer },
      { href: "/admin/services", label: "Services", icon: Wrench },
      { href: "/admin/projects", label: "Projects", icon: FolderKanban },
      { href: "/admin/banners", label: "Banners", icon: GalleryHorizontal },
      { href: "/admin/partners", label: "Partners", icon: Handshake },
      { href: "/admin/about", label: "About", icon: Info },
      { href: "/admin/messages", label: "Messages", icon: Mail, badge: "messages" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/password", label: "Change password", icon: KeyRound },
    ],
  },
];

const COUNTS_POLL_MS = 60_000;

/** Sidebar badge numbers, refreshed every minute and on page change. */
function useAdminCounts(pathname: string): Record<Badge, number> {
  const [counts, setCounts] = useState<Record<Badge, number>>({ orders: 0, messages: 0 });
  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/admin-counts", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { ordersNeedingAction: number; unreadMessages: number } | null) => {
          if (active && data) setCounts({ orders: data.ordersNeedingAction, messages: data.unreadMessages });
        })
        .catch(() => undefined);
    void load();
    const timer = setInterval(load, COUNTS_POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [pathname]);
  return counts;
}

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const toast = useToast();
  const counts = useAdminCounts(pathname);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      // A hard reload is deliberate: no admin page stays in the in-memory router cache.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/admin/login";
    } catch (error) {
      toast.error(errorMessage(error));
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-admin-bg text-admin-text">
      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-admin-line bg-admin-panel transition-transform lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-admin-line px-4">
          <span className="font-semibold">UniUnlocker Admin</span>
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="admin-icon-btn lg:hidden">
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <nav aria-label="Admin" className="flex-1 space-y-5 overflow-y-auto p-3">
          {NAV.map(({ title, links }) => (
            <div key={title}>
              <p className="mb-1 px-3 text-[11px] font-semibold tracking-wider text-admin-muted uppercase">{title}</p>
              <ul className="space-y-0.5">
                {links.map(({ href, label, icon: Icon, badge }) => {
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  const count = badge ? counts[badge] : 0;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                          active ? "bg-primary/15 font-medium text-admin-text" : "text-admin-muted hover:bg-admin-raised hover:text-admin-text"
                        }`}
                      >
                        <Icon aria-hidden className={`size-4 ${active ? "text-primary" : ""}`} />
                        <span className="flex-1">{label}</span>
                        {count > 0 && (
                          <span
                            title={badge === "orders" ? "Orders waiting for you" : "Unread messages"}
                            className={`min-w-5 rounded-full px-1.5 text-center text-xs font-bold text-white ${
                              badge === "orders" ? "bg-status-offline" : "bg-primary"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-admin-line p-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-admin-muted hover:bg-admin-raised hover:text-admin-text"
          >
            <ExternalLink aria-hidden className="size-4" /> View website
          </a>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-admin-line bg-admin-panel/95 px-4 backdrop-blur lg:px-6">
          <button type="button" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className="admin-icon-btn lg:hidden">
            <Menu aria-hidden className="size-5" />
          </button>
          <span className="ml-auto truncate text-sm text-admin-muted">{email}</span>
          <span className="shrink-0">
            <OnlineToggle />
          </span>
          <ThemeToggle className="admin-icon-btn shrink-0" />
          <button type="button" onClick={signOut} disabled={signingOut} className="admin-btn admin-btn-secondary shrink-0">
            <LogOut aria-hidden className="size-4" /> Sign out
          </button>
        </header>
        <main className="mx-auto max-w-6xl p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
