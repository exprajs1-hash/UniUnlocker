/**
 * Cache tags for the public read layer (src/lib/data.ts). An admin write to
 * `/api/<resource>` invalidates the tags listed for that resource, so edits are
 * live on the next page load while every other visitor gets the cached copy.
 */
export const CACHE_TAGS = {
  settings: "settings",
  about: "about",
  services: "services",
  partners: "partners",
  tools: "tools",
  servers: "servers",
  projects: "projects",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

/** Which tags a write to `/api/<resource>/...` makes stale. */
const TAGS_BY_RESOURCE: Record<string, CacheTag[]> = {
  settings: [CACHE_TAGS.settings],
  about: [CACHE_TAGS.about],
  services: [CACHE_TAGS.services],
  partners: [CACHE_TAGS.partners],
  tools: [CACHE_TAGS.tools],
  servers: [CACHE_TAGS.servers],
  projects: [CACHE_TAGS.projects],
};

export function tagsForApiPath(pathname: string): CacheTag[] {
  const resource = pathname.split("/")[2] ?? "";
  return TAGS_BY_RESOURCE[resource] ?? [];
}
