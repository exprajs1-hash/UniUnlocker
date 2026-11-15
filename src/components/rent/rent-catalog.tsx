"use client";

import {
  ArrowRight,
  Clock,
  Headphones,
  KeyRound,
  LayoutGrid,
  List,
  LogIn,
  RotateCcw,
  Search,
  Server,
  Smartphone,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatBdt, ToolIcon } from "@/components/rent/shared";
import { apiFetch, ApiClientError, errorMessage } from "@/lib/client-api";
import { RENT_CATEGORIES, RENT_CATEGORY_LABELS, type PublicRentServiceDTO, type RentCategory } from "@/types";

const CATEGORY_ICONS: Record<RentCategory, typeof KeyRound> = { rent: KeyRound, imei: Smartphone, server: Server };

interface Me {
  name: string;
  balance: number;
}

/** Signed-in customer or null, without the redirect apiFetch does on 401. */
export async function fetchMe(): Promise<Me | null> {
  try {
    const response = await fetch("/api/me", { cache: "no-store" });
    if (!response.ok) return null;
    return ((await response.json()) as { customer: Me }).customer;
  } catch {
    return null;
  }
}

type View = "list" | "grid";
const VIEW_KEY = "rent-view";

function DeliveryBadge({ text }: { text: string }) {
  if (!text) return <span className="text-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-cyan/10 px-2 py-1 text-xs font-medium whitespace-nowrap text-cyan">
      <Clock aria-hidden className="size-3" /> {text}
    </span>
  );
}

function MinQtyBadge({ value }: { value: number }) {
  return <span className="rounded-lg bg-purple/15 px-2 py-1 text-xs font-semibold text-purple">#{value}</span>;
}

export function RentCatalog() {
  const [services, setServices] = useState<PublicRentServiceDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [view, setView] = useState<View>("list");
  const [category, setCategory] = useState<RentCategory>("rent");

  useEffect(() => {
    let active = true;
    const tab = new URLSearchParams(window.location.search).get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the URL after mount
    if (RENT_CATEGORIES.includes(tab as RentCategory)) setCategory(tab as RentCategory);
    apiFetch<{ services: PublicRentServiceDTO[] }>("/api/rent/services")
      .then((data) => active && setServices(data.services))
      .catch((error: unknown) => active && setLoadError(error instanceof ApiClientError ? error.message : errorMessage(error)));
    void fetchMe().then((value) => active && setMe(value));
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {
      // Storage can be blocked; the default view is fine.
    }
    return () => {
      active = false;
    };
  }, []);

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      // ignore
    }
  }

  // A tab shows only once the admin has enabled at least one service in it.
  const categories = useMemo(
    () => RENT_CATEGORIES.filter((value) => (services ?? []).some((service) => service.category === value)),
    [services],
  );
  const activeCategory: RentCategory | null = categories.includes(category) ? category : (categories[0] ?? null);
  const inCategory = useMemo(
    () => (services ?? []).filter((service) => service.category === activeCategory),
    [services, activeCategory],
  );

  const groups = useMemo(() => [...new Set(inCategory.map((service) => service.group).filter(Boolean))].sort(), [inCategory]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return inCategory.filter(
      (service) =>
        (!group || service.group === group) &&
        (!needle || service.name.toLowerCase().includes(needle) || String(service.code).includes(needle)),
    );
  }, [inCategory, query, group]);

  function changeCategory(next: RentCategory) {
    setCategory(next);
    setGroup("");
    // Keep the tab in the URL so it can be shared/bookmarked, without a navigation.
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <div>
      {/* Sections */}
      {categories.length > 1 && (
        <div role="tablist" aria-label="Service type" className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-line/50 p-1">
          {categories.map((value) => {
            const Icon = CATEGORY_ICONS[value];
            const selected = value === activeCategory;
            const count = (services ?? []).filter((service) => service.category === value).length;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => changeCategory(value)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
                  selected ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-muted hover:text-foreground"
                }`}
              >
                <Icon aria-hidden className="size-4" /> {RENT_CATEGORY_LABELS[value]}
                <span className={`rounded-full px-1.5 text-xs ${selected ? "bg-white/20" : "bg-white/5"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { icon: Sparkles, value: services ? String(inCategory.length) : "—", label: "Services" },
          { icon: Headphones, value: "24/7", label: "Support" },
          { icon: Clock, value: "Fast", label: "Delivery" },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="neon-card flex flex-col items-center gap-1 p-3 text-center sm:flex-row sm:gap-3 sm:p-4 sm:text-left">
            <Icon aria-hidden className="size-5 text-cyan" />
            <div>
              <p className="font-display text-lg font-bold sm:text-xl">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search services</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search services or ID…"
            className="neon-input pl-9!"
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setGroup("");
          }}
          className="btn-outline min-h-11! shrink-0 px-4! text-sm"
        >
          <RotateCcw aria-hidden className="size-4" /> Reset
        </button>
        {me ? (
          <Link href="/account" className="btn-outline min-h-11! shrink-0 px-4! text-sm">
            <Wallet aria-hidden className="size-4" /> {formatBdt(me.balance)}
          </Link>
        ) : (
          <Link href="/login?next=%2Frent" className="btn-outline min-h-11! shrink-0 px-4! text-sm">
            <LogIn aria-hidden className="size-4" /> Sign in
          </Link>
        )}
      </div>
      <div className="mb-6 flex items-center gap-3">
        {groups.length > 1 && (
          <label className="min-w-0 flex-1 sm:max-w-64 sm:flex-none">
            <span className="sr-only">Filter by category</span>
            <select value={group} onChange={(event) => setGroup(event.target.value)} className="neon-input">
              <option value="">All categories</option>
              {groups.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div role="group" aria-label="Layout" className="ml-auto flex gap-1 rounded-xl border border-line/50 p-1">
          {(
            [
              { value: "list", icon: List, label: "List view" },
              { value: "grid", icon: LayoutGrid, label: "Grid view" },
            ] as const
          ).map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              aria-pressed={view === value}
              onClick={() => changeView(value)}
              className={`rounded-lg p-2 transition ${view === value ? "bg-primary text-white" : "text-muted hover:text-foreground"}`}
            >
              <Icon aria-hidden className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {loadError ? (
        <p role="alert" className="neon-card p-8 text-center text-muted">
          {loadError}
        </p>
      ) : services === null ? (
        <div role="status" aria-label="Loading" className="space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton h-16" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="neon-card p-8 text-center text-muted">
          {services.length === 0 ? "No tools are available for rent yet. Please check back soon." : "No services match your search."}
        </p>
      ) : view === "list" ? (
        <div className="neon-card overflow-x-auto p-0">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-line/40 text-left text-xs tracking-wide text-muted uppercase">
                <th scope="col" className="px-4 py-3 font-semibold">
                  ID
                </th>
                <th scope="col" className="px-2 py-3 font-semibold">
                  Service name
                </th>
                <th scope="col" className="px-2 py-3 font-semibold">
                  Delivery
                </th>
                <th scope="col" className="px-2 py-3 text-center font-semibold">
                  Min qty
                </th>
                <th scope="col" className="px-2 py-3 text-right font-semibold">
                  Price
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/25">
              {visible.map((service) => (
                <tr key={service.id} className="transition hover:bg-primary/5">
                  <td className="px-4 py-3">
                    <ToolIcon src={service.icon} name={service.name} size={36} />
                  </td>
                  <td className="px-2 py-3">
                    <Link href={`/rent/${service.id}`} className="font-semibold hover:text-cyan">
                      {service.name}
                    </Link>
                    <p className="text-xs text-muted">ID: #{service.code}</p>
                  </td>
                  <td className="px-2 py-3">
                    <DeliveryBadge text={service.deliveryTime} />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <MinQtyBadge value={service.minQuantity} />
                  </td>
                  <td className="px-2 py-3 text-right font-bold whitespace-nowrap text-neon">{formatBdt(service.priceBdt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/rent/${service.id}`} className="btn-neon min-h-9! px-3! text-xs">
                      View <ArrowRight aria-hidden className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((service) => (
            <li key={service.id} className="neon-card neon-card-hover flex flex-col p-5">
              <div className="flex items-start gap-3">
                <ToolIcon src={service.icon} name={service.name} size={48} />
                <div className="min-w-0">
                  {service.group && <p className="truncate text-xs font-semibold tracking-wide text-cyan uppercase">{service.group}</p>}
                  <h2 className="font-display font-semibold">{service.name}</h2>
                  <p className="text-xs text-muted">ID: #{service.code}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-1 flex-wrap items-start gap-2">
                <DeliveryBadge text={service.deliveryTime} />
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  Min <MinQtyBadge value={service.minQuantity} />
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-2xl font-bold text-neon">{formatBdt(service.priceBdt)}</span>
                <Link href={`/rent/${service.id}`} className="btn-neon min-h-10! px-4! text-sm">
                  View <ArrowRight aria-hidden className="size-4" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
