"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LayoutGrid, LogIn, Menu, Send, Wrench, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { categoryHref, categoryIcon } from "@/components/rent/categories";
import { CustomerAvatar } from "@/components/rent/shared";
import { formatTaka } from "@/lib/money";
import { BrandIcon } from "@/components/ui/social-icons";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { ServiceCategoryDTO, UtilityLink } from "@/types";

const LINKS = [
  { id: "home", label: "Home" },
  { id: "servers", label: "Servers" },
  { id: "tools", label: "Tools" },
];

export interface HeaderActions {
  utilityLinks: UtilityLink[];
  whatsappUrl: string | null;
  telegramUrl: string | null;
  /** Built-in and admin-made service categories, for the Services menu. */
  categories: ServiceCategoryDTO[];
}

const CHAT_STYLES = {
  whatsapp: { label: "Chat on WhatsApp", className: "bg-[#25D366] shadow-[0_0_16px_rgb(37_211_102/0.6)]" },
  telegram: { label: "Chat on Telegram", className: "bg-[#229ED9] shadow-[0_0_16px_rgb(34_158_217/0.6)]" },
} as const;

function chatOptions({ whatsappUrl, telegramUrl }: HeaderActions) {
  return [
    whatsappUrl && { key: "whatsapp" as const, href: whatsappUrl },
    telegramUrl && { key: "telegram" as const, href: telegramUrl },
  ].filter((option): option is { key: "whatsapp" | "telegram"; href: string } => Boolean(option));
}

function ChatIconLink({ kind, href, onClick }: { kind: "whatsapp" | "telegram"; href: string; onClick?: () => void }) {
  const style = CHAT_STYLES[kind];
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={style.label}
      title={style.label}
      onClick={onClick}
      className={`flex size-11 items-center justify-center rounded-full text-white transition hover:scale-110 ${style.className}`}
    >
      <BrandIcon name={kind} className="size-5" />
    </a>
  );
}

/** Opens on hover for mouse users and on tap for touch users; Escape or an outside tap closes it. */
function HoverMenu({
  label,
  icon,
  buttonClass,
  align = "right",
  plain = false,
  children,
}: {
  label: string;
  icon: ReactNode;
  buttonClass: string;
  /** Which edge of the button the panel lines up with. */
  align?: "left" | "right";
  /** Use `buttonClass` as is, without the pill button sizing. */
  plain?: boolean;
  /** Receives a function that closes the menu, for links inside it. */
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={plain ? buttonClass : `${buttonClass} min-h-10! px-5! text-sm`}
      >
        {label} {icon}
      </button>
      <AnimatePresence>
        {open && (
          // pt-2 bridges the gap below the button so moving the mouse down does not close it.
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className={`absolute top-full z-50 pt-2 ${align === "left" ? "left-0" : "right-0"}`}
          >
            <div className="rounded-2xl border border-line/60 bg-surface/95 p-2 shadow-(--menu-shadow) backdrop-blur-md">
              {children(() => setOpen(false))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HireMeMenu({ options }: { options: ReturnType<typeof chatOptions> }) {
  return (
    <HoverMenu label="Hire Me" icon={<Send aria-hidden className="size-4" />} buttonClass="btn-neon">
      {(close) => (
        <div className="flex gap-2">
          {options.map(({ key, href }) => (
            <ChatIconLink key={key} kind={key} href={href} onClick={close} />
          ))}
        </div>
      )}
    </HoverMenu>
  );
}

function UtilityMenu({ links }: { links: UtilityLink[] }) {
  return (
    <HoverMenu
      label="Add-On"
      icon={
        <>
          <Wrench aria-hidden className="size-4" />
          <ChevronDown aria-hidden className="size-4" />
        </>
      }
      buttonClass="btn-outline"
    >
      {(close) => (
        <ul className="max-h-80 w-56 overflow-y-auto">
          {links.map(({ name, url }) => (
            <li key={`${name}-${url}`}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="block rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-primary/15 hover:text-cyan"
              >
                {name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </HoverMenu>
  );
}

/** "Services" in the main nav: a dropdown with one page per service type. */
function ServicesMenu({
  buttonClass,
  categories,
  inNav = false,
}: {
  buttonClass: string;
  categories: ServiceCategoryDTO[];
  /** A plain nav link (laptop widths) instead of the pill button next to Add-On. */
  inNav?: boolean;
}) {
  return (
    <HoverMenu
      label="Services"
      icon={
        <>
          {!inNav && <LayoutGrid aria-hidden className="size-4" />}
          <ChevronDown aria-hidden className="size-4" />
        </>
      }
      buttonClass={buttonClass}
      align={inNav ? "left" : "right"}
      plain={inNav}
    >
      {(close) => (
        // Same height as the Add-On list: it scrolls once there are many categories.
        <ul className="max-h-80 w-60 overflow-y-auto">
          {categories.map(({ slug, name, icon }) => {
            const Icon = categoryIcon(icon);
            return (
              <li key={slug}>
                <Link
                  href={categoryHref(slug)}
                  onClick={close}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-primary/15 hover:text-cyan"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primary to-purple text-white">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  {name}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </HoverMenu>
  );
}

interface HeaderCustomer {
  name: string;
  balance: number;
  avatar?: string;
}

/** The signed-in customer for the header, or null. Never redirects (unlike apiFetch on a 401). */
function useHeaderCustomer(pathname: string): HeaderCustomer | null | undefined {
  const [customer, setCustomer] = useState<HeaderCustomer | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    fetch("/api/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { customer: HeaderCustomer } | null) => active && setCustomer(data?.customer ?? null))
      .catch(() => active && setCustomer(null));
    return () => {
      active = false;
    };
    // Re-read on navigation, so the balance is fresh after an order or a sign-in.
  }, [pathname]);
  return customer;
}

/** The customer's photo, name and balance when signed in (links to their account); "Login" otherwise. */
function AccountLink({ customer, onClick, mobile }: { customer: HeaderCustomer | null | undefined; onClick?: () => void; mobile?: boolean }) {
  if (mobile) {
    return (
      <Link href={customer ? "/account" : "/login"} onClick={onClick} className="flex items-center gap-3 py-3 font-medium hover:text-cyan">
        {customer ? (
          <>
            <CustomerAvatar src={customer.avatar} name={customer.name} size={32} />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{customer.name}</span>
              <span className="block text-xs font-semibold text-cyan">Balance {formatTaka(customer.balance)}</span>
            </span>
          </>
        ) : (
          <>
            <LogIn aria-hidden className="size-5" /> Login / Register
          </>
        )}
      </Link>
    );
  }
  if (customer === undefined) {
    // Still loading: keep the space so the header does not jump.
    return <span aria-hidden className="block h-10 w-28 animate-pulse rounded-full bg-glass/10" />;
  }
  if (!customer) {
    return (
      <Link href="/login" onClick={onClick} className="btn-outline min-h-10! px-4! text-sm">
        <LogIn aria-hidden className="size-4" /> Login
      </Link>
    );
  }
  return (
    <Link
      href="/account"
      onClick={onClick}
      title={`${customer.name}: my account`}
      className="group flex max-w-48 items-center gap-2 rounded-full border border-line/60 py-1 pr-4 pl-1 transition hover:border-cyan"
    >
      <CustomerAvatar src={customer.avatar} name={customer.name} size={32} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold">{customer.name}</span>
        {/* The balance stays private (e.g. on a shared screen) until the pill is hovered or focused. */}
        <span className="grid text-xs font-bold text-cyan tabular-nums">
          <span
            aria-hidden
            className="col-start-1 row-start-1 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0"
          >
            ৳ ••••
          </span>
          <span className="col-start-1 row-start-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <span className="sr-only">Balance </span>
            {formatTaka(customer.balance)}
          </span>
        </span>
      </span>
    </Link>
  );
}

export function Navbar({ brand, actions }: { brand: ReactNode; actions: HeaderActions }) {
  const chats = chatOptions(actions);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");
  const pathname = usePathname();
  const onHome = pathname === "/";
  const onServices = pathname.startsWith("/services");
  const customer = useHeaderCustomer(pathname);

  // Sections stream in after hydration, so a MutationObserver picks up late arrivals.
  useEffect(() => {
    if (!onHome) return;
    const intersection = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    const observeSections = () => {
      for (const { id } of LINKS) {
        const section = document.getElementById(id);
        if (section) intersection.observe(section);
      }
    };
    observeSections();
    const mutation = new MutationObserver(observeSections);
    mutation.observe(document.body, { childList: true, subtree: true });
    return () => {
      intersection.disconnect();
      mutation.disconnect();
    };
  }, [onHome]);

  const linkClass = (id: string) =>
    `rounded-lg px-3.5 py-2 text-sm font-medium transition ${
      onHome && active === id
        ? "bg-linear-to-r from-primary to-[#00b4ff] text-white shadow-[0_0_16px_rgb(8_123_255/0.6)]"
        : "text-foreground/85 hover:text-cyan"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-line/30 bg-background/80 backdrop-blur-md">
      <nav aria-label="Main" className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">
        <Link href="/#home" aria-label="Home" onClick={() => setOpen(false)}>
          {brand}
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map(({ id, label }) => (
            <li key={id}>
              <Link href={`/#${id}`} aria-current={onHome && active === id ? "true" : undefined} className={linkClass(id)}>
                {label}
              </Link>
            </li>
          ))}
          {/* Laptop widths only: from xl the Services button sits next to Add-On instead. */}
          <li className="xl:hidden">
            <ServicesMenu
              inNav
              categories={actions.categories}
              buttonClass={`inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                onServices
                  ? "bg-linear-to-r from-primary to-[#00b4ff] text-white shadow-[0_0_16px_rgb(8_123_255/0.6)]"
                  : "text-foreground/85 hover:text-cyan"
              }`}
            />
          </li>
        </ul>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            {chats.length > 0 && <HireMeMenu options={chats} />}
            {actions.utilityLinks.length > 0 && <UtilityMenu links={actions.utilityLinks} />}
          </div>
          {/* Only on wide screens: below xl it would crowd the header, so it is a nav link there. */}
          {actions.categories.length > 0 && (
            <div className="hidden xl:block">
              <ServicesMenu categories={actions.categories} buttonClass={`btn-outline ${onServices ? "border-cyan! text-cyan" : ""}`} />
            </div>
          )}
          <ThemeToggle className="flex size-10 items-center justify-center rounded-full border border-line/60 transition hover:border-cyan hover:text-cyan" />
          <div className="hidden sm:block">
            <AccountLink customer={customer} />
          </div>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((value) => !value)}
            className="flex size-11 items-center justify-center rounded-lg border border-line lg:hidden"
          >
            {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.ul
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-line/30 px-5 lg:hidden"
          >
            {LINKS.map(({ id, label }) => (
              <li key={id}>
                <Link href={`/#${id}`} onClick={() => setOpen(false)} className="block py-3 font-medium hover:text-cyan">
                  {label}
                </Link>
              </li>
            ))}
            <li className="border-t border-line/30 py-3">
              <p className="flex items-center gap-2 text-sm font-medium text-muted">
                <LayoutGrid aria-hidden className="size-4" /> Services
              </p>
              <ul className="mt-1">
                {actions.categories.map(({ slug, name, icon }) => {
                  const Icon = categoryIcon(icon);
                  return (
                    <li key={slug}>
                      <Link
                        href={categoryHref(slug)}
                        onClick={() => setOpen(false)}
                        aria-current={pathname === categoryHref(slug) ? "page" : undefined}
                        className="flex items-center gap-3 py-2.5 pl-1 font-medium hover:text-cyan aria-[current=page]:text-cyan"
                      >
                        <Icon aria-hidden className="size-4 text-cyan" />
                        {name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
            <li className="border-t border-line/30">
              <AccountLink customer={customer} mobile onClick={() => setOpen(false)} />
            </li>
            {/* The header buttons are hidden on small phones, so they are offered here instead. */}
            {chats.length > 0 && (
              <li className="flex items-center gap-2 border-t border-line/30 py-4 sm:hidden">
                <span className="text-sm font-medium text-muted">Hire Me:</span>
                {chats.map(({ key, href }) => (
                  <ChatIconLink key={key} kind={key} href={href} onClick={() => setOpen(false)} />
                ))}
              </li>
            )}
            {actions.utilityLinks.length > 0 && (
              <li className="border-t border-line/30 py-3 sm:hidden">
                <p className="text-sm font-medium text-muted">Add-On</p>
                <ul>
                  {actions.utilityLinks.map(({ name, url }) => (
                    <li key={`${name}-${url}`}>
                      <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="block py-2 font-medium hover:text-cyan">
                        {name}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </header>
  );
}
