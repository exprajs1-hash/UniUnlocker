"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ALL_CATEGORIES, CategoryFilter, PROJECT_COLUMNS, ProjectCard, projectCategories } from "@/components/sections/project-card";
import type { ProjectDTO } from "@/types";

/** Homepage grid: filters in place with an animated re-layout. */
export function PortfolioGrid({ projects }: { projects: ProjectDTO[] }) {
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const categories = useMemo(() => projectCategories(projects), [projects]);
  // The chosen category can disappear if projects change, so fall back to All.
  const activeCategory = categories.includes(category) ? category : ALL_CATEGORIES;
  const visible = projects.filter((p) => activeCategory === ALL_CATEGORIES || p.category === activeCategory);

  return (
    <>
      <CategoryFilter categories={categories} active={activeCategory} onSelect={setCategory} className="mt-8" />
      <ul className={`mt-8 grid gap-5 ${PROJECT_COLUMNS}`}>
        <AnimatePresence initial={false}>
          {visible.map((project) => (
            <motion.li
              key={project.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
            >
              <ProjectCard project={project} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </>
  );
}
