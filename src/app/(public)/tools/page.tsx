import type { Metadata } from "next";
import { ListingPage, PagedResults } from "@/components/listing/listing-page";
import { TOOL_COLUMNS, ToolGrid } from "@/components/sections/tool-grid";
import { getEnabledTools } from "@/lib/data";
import { PAGE_SIZES } from "@/lib/listing-config";
import { paginate } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "Our Most Selling Tools",
  description: "The tools our customers buy the most.",
  alternates: { canonical: "/tools" },
};

type Props = PageProps<"/tools">;

async function ToolResults({ searchParams }: Pick<Props, "searchParams">) {
  const tools = await getEnabledTools();
  if (tools.length === 0) return <ToolGrid tools={[]} />;
  const paged = paginate(tools, (await searchParams).page, PAGE_SIZES.tools);
  return (
    <PagedResults paged={paged} basePath="/tools">
      <ToolGrid tools={paged.items} />
    </PagedResults>
  );
}

export default function ToolsPage({ searchParams }: Props) {
  return (
    <ListingPage
      backHref="/#tools"
      lead="Our Most Selling"
      highlight="Tools"
      subtitle="The tools our customers buy the most"
      skeletonColumns={TOOL_COLUMNS}
    >
      <ToolResults searchParams={searchParams} />
    </ListingPage>
  );
}
