import { ViewAllFooter } from "@/components/listing/view-all-link";
import { SectionHeading } from "@/components/sections/section-heading";
import { ServiceGrid } from "@/components/sections/service-grid";
import { Reveal } from "@/components/ui/reveal";
import { getEnabledServices } from "@/lib/data";
import { HOME_LIMITS } from "@/lib/listing-config";

export async function ServicesSection() {
  const services = await getEnabledServices();
  const shown = services.slice(0, HOME_LIMITS.services);
  return (
    <section id="services" className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
      <Reveal>
        <SectionHeading lead="My" highlight="Services" subtitle="Professional services for all your mobile software needs" />
      </Reveal>
      <div className="mt-10">
        <ServiceGrid services={shown} />
      </div>
      <ViewAllFooter href="/services" shown={shown.length} total={services.length} />
    </section>
  );
}
