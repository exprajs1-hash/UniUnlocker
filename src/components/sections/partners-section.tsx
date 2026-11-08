import { ViewAllFooter } from "@/components/listing/view-all-link";
import { PartnerMarquee } from "@/components/sections/partner-grid";
import { SectionHeading } from "@/components/sections/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { getEnabledPartners } from "@/lib/data";

export async function PartnersSection() {
  const partners = await getEnabledPartners();
  return (
    <section id="partners" className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
      <Reveal>
        <SectionHeading lead="Our Trusted" highlight="Partners" subtitle="Brands and services we proudly work with" />
      </Reveal>
      <div className="mt-10">
        <PartnerMarquee partners={partners} />
      </div>
      <ViewAllFooter href="/partners" shown={partners.length} total={partners.length} />
    </section>
  );
}
