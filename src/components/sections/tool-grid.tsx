import { Wrench } from "lucide-react";
import { PartnerCard } from "@/components/sections/partner-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { Marquee } from "@/components/ui/marquee";
import { Reveal } from "@/components/ui/reveal";
import type { ToolDTO } from "@/types";

export const TOOL_COLUMNS = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5";

function ToolsEmpty() {
  return <EmptyState icon={Wrench} title="Tools coming soon" message="Our most selling tools will be listed here shortly." />;
}

/** Homepage: every tool scrolling left, five in view (three on tablets, two on phones). */
export function ToolMarquee({ tools }: { tools: ToolDTO[] }) {
  if (tools.length === 0) return <ToolsEmpty />;
  return (
    <Marquee label="Most selling tools" itemClassName="w-[calc(100cqw/2)] sm:w-[calc(100cqw/3)] lg:w-[calc(100cqw/5)]">
      {tools.map((tool) => (
        <PartnerCard key={tool.id} partner={tool} />
      ))}
    </Marquee>
  );
}

export function ToolGrid({ tools }: { tools: ToolDTO[] }) {
  if (tools.length === 0) return <ToolsEmpty />;
  return (
    <ul className={`grid gap-4 ${TOOL_COLUMNS}`}>
      {tools.map((tool, index) => (
        <li key={tool.id}>
          <Reveal delay={index * 0.05} className="h-full">
            <PartnerCard partner={tool} />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
