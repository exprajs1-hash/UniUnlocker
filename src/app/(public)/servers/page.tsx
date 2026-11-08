import type { Metadata } from "next";
import { ListingPage, PagedResults } from "@/components/listing/listing-page";
import { CurrencyToggle, SERVER_COLUMNS, ServerCardGrid } from "@/components/sections/server-card";
import { getEnabledServers } from "@/lib/data";
import { PAGE_SIZES } from "@/lib/listing-config";
import { paginate } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "All Servers",
  description: "Live status and prices for every server.",
  alternates: { canonical: "/servers" },
};

type Props = PageProps<"/servers">;

async function ServerResults({ searchParams }: Pick<Props, "searchParams">) {
  const servers = await getEnabledServers();
  if (servers === null) {
    return <p className="py-12 text-center text-muted">Live status is temporarily unavailable. Please try again shortly.</p>;
  }
  if (servers.length === 0) {
    return <p className="py-12 text-center text-muted">No servers are listed right now.</p>;
  }
  const paged = paginate(servers, (await searchParams).page, PAGE_SIZES.servers);
  return (
    <PagedResults paged={paged} basePath="/servers">
      <ServerCardGrid servers={paged.items} startNumber={paged.start + 1} className={`grid gap-3 ${SERVER_COLUMNS}`} />
    </PagedResults>
  );
}

export default function ServersPage({ searchParams }: Props) {
  return (
    <ListingPage
      backHref="/#servers"
      lead="All"
      highlight="Servers"
      subtitle="Live status and prices for every server"
      toolbar={<CurrencyToggle />}
      skeletonColumns={SERVER_COLUMNS}
    >
      <ServerResults searchParams={searchParams} />
    </ListingPage>
  );
}
