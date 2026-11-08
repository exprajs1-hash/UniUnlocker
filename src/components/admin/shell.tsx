"use client";

import {
  ExternalLink,
  FolderKanban,
  Handshake,
  Info,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Server,
  Settings,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useToast } from "@/components/ui/toast";
import { apiFetch, errorMessage } from "@/lib/client-api";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/servers", label: "Servers", icon: Server },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/services", label: "Services", icon: Wrench },
  { href: "/admin/partners", label: "Partners", icon: Handshake },
  { href: "/admin/about", label: "About", icon: Info },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const toast = useToast();

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
        <nav aria-label="Admin" className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active ? "bg-primary/15 font-medium text-admin-text" : "text-admin-muted hover:bg-admin-raised hover:text-admin-text"
                }`}
              >
                <Icon aria-hidden className={`size-4 ${active ? "text-primary" : ""}`} /> {label}
              </Link>
            );
          })}
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
          <button type="button" onClick={signOut} disabled={signingOut} className="admin-btn admin-btn-secondary shrink-0">
            <LogOut aria-hidden className="size-4" /> Sign out
          </button>
        </header>
        <main className="mx-auto max-w-6xl p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
