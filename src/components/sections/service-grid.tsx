import { Wrench } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import { getServiceIcon } from "@/lib/service-icons";
import type { ServiceDTO } from "@/types";

export const SERVICE_COLUMNS = "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";

export function ServiceGrid({ services }: { services: ServiceDTO[] }) {
  if (services.length === 0) {
    return <EmptyState icon={Wrench} title="Services coming soon" message="Service details will be listed here shortly." />;
  }
  return (
    <ul className={`grid gap-5 ${SERVICE_COLUMNS}`}>
      {services.map((service, index) => {
        const Icon = getServiceIcon(service.icon);
        return (
          <li key={service.id}>
            <Reveal delay={index * 0.06} className="h-full">
              <article className="neon-card neon-card-hover flex h-full flex-col items-center gap-3 p-6 text-center">
                <Icon aria-hidden className="size-12 text-cyan drop-shadow-[0_0_10px_rgb(0_229_255/0.7)]" />
                <h3 className="font-display text-lg leading-snug font-semibold">{service.title}</h3>
                {service.description && <p className="text-sm text-muted">{service.description}</p>}
              </article>
            </Reveal>
          </li>
        );
      })}
    </ul>
  );
}
