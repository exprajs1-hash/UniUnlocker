"use client";

import { ArrowRight, Clock, KeyRound, Server, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ViewAllLink } from "@/components/listing/view-all-link";
import { PriceTag, ToolIcon } from "@/components/rent/shared";
import { SectionHeading } from "@/components/sections/section-heading";
import { apiFetch } from "@/lib/client-api";
import { RENT_CATEGORIES, RENT_CATEGORY_LABELS, type PublicRentServiceDTO, type RentCategory } from "@/types";

/** How many services each category shows on the homepage before "View All". */
const PER_CATEGORY = 4;

const ICONS: Record<RentCategory, typeof KeyRound> = {
  rent: KeyRound,
  imei: Smartphone,
  server: Server,
};

/**
 * Homepage preview of the three service types, a few each, linking to the full
 * catalog tab. Loaded in the browser like the catalog, so a signed-in customer
 * sees their own price here too.
 */
export function RentServicesSection() {
  const [services, setServices] = useState<PublicRentServiceDTO[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<{ services: PublicRentServiceDTO[] }>("/api/rent/services")
      .then((data) => active && setServices(data.services))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, []);

  // Nothing to show: the rest of the homepage carries on without an empty block.
  if (failed || (services !== null && services.length === 0)) return null;

  const categories = RENT_CATEGORIES.map((category) => ({
    category,
    items: (services ?? []).filter((service) => service.category === category),
  })).filter(({ items }) => services === null || items.length > 0);

  return (
    <section id="services" className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
      <SectionHeading lead="Our" highlight="Services" subtitle="Tool rent, IMEI and server services, paid from your balance." />

      <div className={`mt-10 grid gap-5 ${categories.length >= 3 ? "lg:grid-cols-3" : categories.length === 2 ? "md:grid-cols-2" : ""}`}>
        {categories.map(({ category, items }) => {
          const Icon = ICONS[category];
          return (
            <div key={category} className="neon-card flex flex-col p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex min-w-0 items-center gap-2 font-display text-lg font-bold">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-purple text-white">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <span className="truncate">{RENT_CATEGORY_LABELS[category]}</span>
                  {services !== null && (
                    <span className="rounded-full bg-glass/5 px-2 text-xs font-semibold text-muted">{items.length}</span>
                  )}
                </h3>
                <ViewAllLink href={`/services?tab=${category}`} size="small" />
              </div>

              {services === null ? (
                <ul aria-label="Loading" className="mt-4 space-y-2">
                  {Array.from({ length: PER_CATEGORY }, (_, index) => (
                    <li key={index} className="skeleton h-14" />
                  ))}
                </ul>
              ) : (
                <ul className="mt-4 flex-1 divide-y divide-line/25">
                  {items.slice(0, PER_CATEGORY).map((service) => (
                    <li key={service.id}>
                      <Link
                        href={`/services/${service.id}`}
                        className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition hover:bg-primary/5"
                      >
                        <ToolIcon src={service.icon} name={service.name} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{service.name}</p>
                          {service.deliveryTime && (
                            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted">
                              <Clock aria-hidden className="size-3" /> {service.deliveryTime}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-sm font-bold whitespace-nowrap text-neon">
                          <PriceTag price={service.priceBdt} regular={service.regularPriceBdt} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {services !== null && items.length > PER_CATEGORY && (
                <Link
                  href={`/services?tab=${category}`}
                  className="mt-3 inline-flex items-center gap-1 self-center text-xs font-semibold text-cyan hover:underline"
                >
                  +{items.length - PER_CATEGORY} more <ArrowRight aria-hidden className="size-3" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
