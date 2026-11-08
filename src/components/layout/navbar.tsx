"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, Menu, Send, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BrandIcon } from "@/components/ui/social-icons";

const LINKS = [
  { id: "home", label: "Home" },
  { id: "services", label: "Services" },
  { id: "servers", label: "Servers" },
  { id: "partners", label: "Partners" },
];

export interface HeaderActions {
  driverUrl: string | null;
  whatsappUrl: string | null;
  telegramUrl: string | null;
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
function HireMeMenu({ options }: { options: ReturnType<typeof chatOptions> }) {
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
        className="btn-neon min-h-10! px-5! text-sm"
      >
        Hire Me <Send aria-hidden className="size-4" />
      </button>
      <AnimatePresence>
        {open && (
          // pt-2 bridges the gap below the button so moving the mouse down does not close it.
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 z-50 pt-2"
          >
            <div className="flex gap-2 rounded-2xl border border-line/60 bg-surface/95 p-2 shadow-[0_8px_30px_rgb(0_0_0/0.5)] backdrop-blur-md">
              {options.map(({ key, href }) => (
                <ChatIconLink key={key} kind={key} href={href} onClick={() => setOpen(false)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Navbar({ brand, actions }: { brand: ReactNode; actions: HeaderActions }) {
  const chats = chatOptions(actions);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");
  const pathname = usePathname();
  const onHome = pathname === "/";

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
        ? "bg-linear-to-r from-primary to-[#00b4ff] shadow-[0_0_16px_rgb(8_123_255/0.6)]"
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
        </ul>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            {chats.length > 0 && <HireMeMenu options={chats} />}
            {actions.driverUrl && (
              <a href={actions.driverUrl} target="_blank" rel="noopener noreferrer" className="btn-outline min-h-10! px-5! text-sm">
                <Download aria-hidden className="size-4" /> Get Driver
              </a>
            )}
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
            {/* The header buttons are hidden on small phones, so they are offered here instead. */}
            {(actions.driverUrl || chats.length > 0) && (
              <li className="flex flex-wrap items-center gap-3 border-t border-line/30 py-4 sm:hidden">
                {chats.length > 0 && (
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted">Hire Me:</span>
                    {chats.map(({ key, href }) => (
                      <ChatIconLink key={key} kind={key} href={href} onClick={() => setOpen(false)} />
                    ))}
                  </span>
                )}
                {actions.driverUrl && (
                  <a href={actions.driverUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="btn-outline min-h-10! px-5! text-sm">
                    <Download aria-hidden className="size-4" /> Get Driver
                  </a>
                )}
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </header>
  );
}
