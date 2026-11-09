import type { MetadataRoute } from "next";
import { getPublishedProjects } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const projects = await getPublishedProjects();
  return [
    { url: base },
    ...["/services", "/servers", "/portfolio", "/tools", "/partners"].map((path) => ({ url: `${base}${path}` })),
    { url: `${base}/privacy` },
    { url: `${base}/terms` },
    ...projects.map((project) => ({
      url: `${base}/portfolio/${project.slug}`,
      lastModified: project.updatedAt,
    })),
  ];
}
