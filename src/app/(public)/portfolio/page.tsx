import type { Metadata } from "next";
import { ListingPage, PagedResults } from "@/components/listing/listing-page";
import {
  ALL_CATEGORIES,
  CategoryFilter,
  PROJECT_COLUMNS,
  ProjectCard,
  ProjectsEmpty,
  projectCategories,
} from "@/components/sections/project-card";
import { getPublishedProjects } from "@/lib/data";
import { PAGE_SIZES } from "@/lib/listing-config";
import { firstParam, listingHref, paginate } from "@/lib/pagination";

export const metadata: Metadata = {
  title: "All Projects",
  description: "UniUnlocker portfolio – our recent mobile software, unlocking and repair work.",
  alternates: { canonical: "/portfolio" },
};

type Props = PageProps<"/portfolio">;

async function ProjectResults({ searchParams }: Pick<Props, "searchParams">) {
  const projects = await getPublishedProjects();
  if (projects.length === 0) return <ProjectsEmpty />;

  const query = await searchParams;
  const categories = projectCategories(projects);
  const requested = firstParam(query.category);
  // An unknown category (old link, typo) falls back to showing everything.
  const active = requested && categories.includes(requested) ? requested : ALL_CATEGORIES;
  const filtered = active === ALL_CATEGORIES ? projects : projects.filter((p) => p.category === active);
  const paged = paginate(filtered, query.page, PAGE_SIZES.projects);
  const categoryParam = active === ALL_CATEGORIES ? undefined : active;
  // Choosing a category starts again from page 1.
  const hrefs = Object.fromEntries(
    categories.map((name) => [name, listingHref("/portfolio", { category: name === ALL_CATEGORIES ? undefined : name })]),
  );

  return (
    <>
      <CategoryFilter categories={categories} active={active} hrefs={hrefs} className="mb-8" />
      <PagedResults paged={paged} basePath="/portfolio" params={{ category: categoryParam }}>
        <ul className={`grid gap-5 ${PROJECT_COLUMNS}`}>
          {paged.items.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      </PagedResults>
    </>
  );
}

export default function PortfolioPage({ searchParams }: Props) {
  return (
    <ListingPage
      backHref="/#portfolio"
      lead="All"
      highlight="Projects"
      subtitle="Some of my recent work"
      skeletonColumns={PROJECT_COLUMNS}
    >
      <ProjectResults searchParams={searchParams} />
    </ListingPage>
  );
}
