import { ViewAllFooter } from "@/components/listing/view-all-link";
import { SectionHeading } from "@/components/sections/section-heading";
import { ToolMarquee } from "@/components/sections/tool-grid";
import { Reveal } from "@/components/ui/reveal";
import { getEnabledTools } from "@/lib/data";

export async function ToolsSection() {
  const tools = await getEnabledTools();
  return (
    <section id="tools" className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
      <Reveal>
        <SectionHeading lead="Our Most Selling" highlight="Tools" subtitle="The tools our customers buy the most" />
      </Reveal>
      <div className="mt-10">
        <ToolMarquee tools={tools} />
      </div>
      <ViewAllFooter href="/tools" shown={tools.length} total={tools.length} />
    </section>
  );
}
