"use client";

import { Clock, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ViewAllLink } from "@/components/listing/view-all-link";
import { PriceTag, ToolIcon } from "@/components/rent/shared";
import { apiFetch } from "@/lib/client-api";
import type { PublicRentServiceDTO } from "@/types";

/** How many of the newest services the homepage shows. */
const RECENT_COUNT = 16;

/**
 * Homepage "Recent Added": the newest services of every type (rent, IMEI,
 * server) mixed in one grid. Loaded in the browser like the catalog, so a
 * signed-in customer sees their own price here too.
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

  // ISO dates sort correctly as strings; newest first.
  const recent = services
    ? [...services].sort((a, b) => b.addedAt.localeCompare(a.addedAt)).slice(0, RECENT_COUNT)
    : null;

  return (
    <section id="services" className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
      <div className="neon-card overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 bg-linear-to-r from-primary to-purple px-5 py-3.5 text-white">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-wide uppercase">
            <Clock aria-hidden className="size-5" /> Recent Added
          </h2>
          <span className="rounded-md border border-white/40 bg-white/15 px-2.5 py-1 text-xs font-bold tracking-wider uppercase">
            Latest
          </span>
        </div>

        <ul className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recent === null
            ? Array.from({ length: RECENT_COUNT }, (_, index) => (
                <li key={index} aria-hidden className="skeleton h-20" />
              ))
            : recent.map((service) => (
                <li key={service.id}>
                  <Link
                    href={`/services/${service.id}`}
                    className="flex h-full items-center gap-3 rounded-xl border border-line/30 bg-glass/5 p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5"
                  >
                    <ToolIcon src={service.icon} name={service.name} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold uppercase" title={service.name}>
                        {service.name}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="text-base font-bold whitespace-nowrap text-neon">
                          <PriceTag price={service.priceBdt} regular={service.regularPriceBdt} />
                        </span>
                        {service.deliveryTime && (
                          <span className="inline-flex min-w-0 items-center gap-1 border-l border-line/40 pl-2 font-semibold text-muted uppercase">
                            <Zap aria-hidden className="size-3 shrink-0 text-amber-400" />
                            <span className="truncate">{service.deliveryTime}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
        </ul>

        <div className="flex justify-center pb-5">
          <ViewAllLink href="/services" size="small" />
        </div>
      </div>
    </section>
  );
}
