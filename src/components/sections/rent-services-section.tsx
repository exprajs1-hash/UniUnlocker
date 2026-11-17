"use client";

import { Clock, Flame, Star, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ViewAllLink } from "@/components/listing/view-all-link";
import { PriceTag, ToolIcon } from "@/components/rent/shared";
import { apiFetch } from "@/lib/client-api";
import type { PublicRentServiceDTO } from "@/types";

/** Most cards one homepage block shows. */
const MAX_PER_BLOCK = 16;
/** Skeleton cards while the list loads. */
const SKELETON_COUNT = 8;

type Theme = "featured" | "hot" | "recent";

const THEMES: Record<
  Theme,
  { title: string; badge: string; icon: LucideIcon; header: string; card: string; ribbon?: string }
> = {
  featured: {
    title: "Featured Products",
    badge: "Top picks",
    icon: Star,
    header: "from-amber-500 to-orange-500",
    card: "border-amber-400/30 hover:border-amber-400/70 hover:bg-amber-400/5",
  },
  hot: {
    title: "Hot Products",
    badge: "Offer",
    icon: Flame,
    header: "from-rose-500 via-red-500 to-orange-500",
    card: "border-rose-500/35 hover:border-rose-500/70 hover:bg-rose-500/5",
    ribbon: "Hot",
  },
  recent: {
    title: "Recent Added",
    badge: "Latest",
    icon: Clock,
    header: "from-primary to-purple",
    card: "border-line/30 hover:border-primary/50 hover:bg-primary/5",
  },
};

/**
 * Homepage service blocks: Featured and Hot (picked by the admin) and Recent
 * Added (newest of every type, mixed). One request feeds all three; it runs in
 * the browser like the catalog, so a signed-in customer sees their own price.
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

  const featured = services?.filter((service) => service.featured) ?? null;
  const hot = services?.filter((service) => service.hot) ?? null;
  // ISO dates sort correctly as strings; newest first.
  const recent = services ? [...services].sort((a, b) => b.addedAt.localeCompare(a.addedAt)) : null;

  return (
    <section id="services" className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:space-y-10 sm:px-5 sm:py-14 lg:px-8">
      {/* While loading only Recent shows a skeleton; the picked blocks appear once we know they have items. */}
      {featured && featured.length > 0 && <ServiceBlock theme="featured" items={featured} />}
      {hot && hot.length > 0 && <ServiceBlock theme="hot" items={hot} />}
      <ServiceBlock theme="recent" items={recent} />
    </section>
  );
}

function ServiceBlock({ theme, items }: { theme: Theme; items: PublicRentServiceDTO[] | null }) {
  const { title, badge, icon: Icon, header, card, ribbon } = THEMES[theme];
  const headingId = `home-${theme}-heading`;

  return (
    <div role="region" aria-labelledby={headingId} className="neon-card overflow-hidden p-0">
      <div className={`flex items-center justify-between gap-3 bg-linear-to-r px-4 py-3 text-white sm:px-5 sm:py-3.5 ${header}`}>
        <h2 id={headingId} className="flex items-center gap-2 font-display text-base font-bold tracking-wide uppercase sm:text-lg">
          <Icon aria-hidden className="size-4 fill-white/25 sm:size-5" /> {title}
        </h2>
        <span className="shrink-0 rounded-md border border-white/40 bg-white/15 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase sm:px-2.5 sm:py-1 sm:text-xs">
          {badge}
        </span>
      </div>

      <ul className="grid gap-3 p-3 sm:grid-cols-2 sm:gap-4 sm:p-5 lg:grid-cols-3 xl:grid-cols-4">
        {items === null
          ? Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <li key={index} aria-hidden className="skeleton h-[4.5rem] sm:h-20" />
            ))
          : items.slice(0, MAX_PER_BLOCK).map((service) => (
              <li key={service.id}>
                <Link
                  href={`/services/${service.id}`}
                  className={`relative flex h-full items-center gap-3 overflow-hidden rounded-xl border bg-glass/5 p-3 transition hover:-translate-y-0.5 sm:p-4 ${card}`}
                >
                  {ribbon && (
                    <span className="absolute top-0 right-0 inline-flex items-center gap-0.5 rounded-bl-lg bg-linear-to-r from-rose-500 to-orange-500 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
                      <Flame aria-hidden className="size-2.5 fill-current" /> {ribbon}
                    </span>
                  )}
                  <ToolIcon src={service.icon} name={service.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`line-clamp-2 text-[13px] leading-snug font-bold break-words uppercase sm:text-sm ${ribbon ? "pr-8" : ""}`}
                      title={service.name}
                    >
                      {service.name}
                    </p>
                    <div className="mt-1 flex min-w-0 items-center gap-2 text-xs">
                      <span className="shrink-0 text-[15px] font-bold whitespace-nowrap text-neon sm:text-base">
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

      <div className="flex justify-center pb-4 sm:pb-5">
        <ViewAllLink href="/services" size="small" />
      </div>
    </div>
  );
}
