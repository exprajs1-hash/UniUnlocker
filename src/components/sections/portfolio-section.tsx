import { ViewAllFooter } from "@/components/listing/view-all-link";
import { PortfolioGrid } from "@/components/sections/portfolio-grid";
import { ProjectsEmpty } from "@/components/sections/project-card";
import { SectionHeading } from "@/components/sections/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { getPublishedProjects } from "@/lib/data";
import { HOME_LIMITS } from "@/lib/listing-config";

export async function PortfolioSection() {
  const projects = await getPublishedProjects();
  const shown = projects.slice(0, HOME_LIMITS.projects);
  return (
    <section id="portfolio" className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
      <Reveal>
        <SectionHeading lead="My" highlight="Projects" subtitle="Some of my recent work" />
      </Reveal>
      {shown.length === 0 ? (
        <div className="mt-10">
          <ProjectsEmpty />
        </div>
      ) : (
        <PortfolioGrid projects={shown} />
      )}
      <ViewAllFooter href="/portfolio" shown={shown.length} total={projects.length} />
    </section>
  );
}
