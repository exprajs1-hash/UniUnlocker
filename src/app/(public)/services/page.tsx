import type { Metadata } from "next";
import { ListingPage, PagedResults } from "@/components/listing/listing-page";
import { SERVICE_COLUMNS, ServiceGrid } from "@/components/sections/service-grid";
import { getEnabledServices } from "@/lib/data";
import { PAGE_SIZES } from "@/lib/listing-config";
import { paginate } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "All Services",
  description: "UniUnlocker services – mobile unlocking, FRP bypass, IMEI repair and every mobile software service we offer.",
  alternates: { canonical: "/services" },
};

type Props = PageProps<"/services">;

async function ServiceResults({ searchParams }: Pick<Props, "searchParams">) {
  const services = await getEnabledServices();
  if (services.length === 0) return <ServiceGrid services={[]} />;
  const paged = paginate(services, (await searchParams).page, PAGE_SIZES.services);
  return (
    <PagedResults paged={paged} basePath="/services">
      <ServiceGrid services={paged.items} />
    </PagedResults>
  );
}

export default function ServicesPage({ searchParams }: Props) {
  return (
    <ListingPage
      backHref="/#services"
      lead="All"
      highlight="Services"
      subtitle="Professional services for all your mobile software needs"
      skeletonColumns={SERVICE_COLUMNS}
    >
      <ServiceResults searchParams={searchParams} />
    </ListingPage>
  );
}
