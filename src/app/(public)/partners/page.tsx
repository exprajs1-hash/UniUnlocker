import type { Metadata } from "next";
import { ListingPage, PagedResults } from "@/components/listing/listing-page";
import { PARTNER_COLUMNS, PartnerGrid } from "@/components/sections/partner-grid";
import { getEnabledPartners } from "@/lib/data";
import { PAGE_SIZES } from "@/lib/listing-config";
import { paginate } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "Our Trusted Partners",
  description: "Brands and services we proudly work with.",
  alternates: { canonical: "/partners" },
};

type Props = PageProps<"/partners">;

async function PartnerResults({ searchParams }: Pick<Props, "searchParams">) {
  const partners = await getEnabledPartners();
  if (partners.length === 0) return <PartnerGrid partners={[]} />;
  const paged = paginate(partners, (await searchParams).page, PAGE_SIZES.partners);
  return (
    <PagedResults paged={paged} basePath="/partners">
      <PartnerGrid partners={paged.items} />
    </PagedResults>
  );
}

export default function PartnersPage({ searchParams }: Props) {
  return (
    <ListingPage
      backHref="/#partners"
      lead="Our Trusted"
      highlight="Partners"
      subtitle="Brands and services we proudly work with"
      skeletonColumns={PARTNER_COLUMNS}
    >
      <PartnerResults searchParams={searchParams} />
    </ListingPage>
  );
}
