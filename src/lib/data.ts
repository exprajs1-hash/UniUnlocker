import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { cache } from "react";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { DEFAULT_ABOUT, DEFAULT_SETTINGS } from "@/lib/defaults";
import { connectToDatabase } from "@/lib/mongodb";
import { withConvertedPrices } from "@/lib/pricing";
import { serialize, serializeMany } from "@/lib/serialize";
import { About } from "@/models/About";
import { Partner } from "@/models/Partner";
import { Project } from "@/models/Project";
import { Server } from "@/models/Server";
import { Service } from "@/models/Service";
import { Tool } from "@/models/Tool";
import { WebsiteSettings } from "@/models/WebsiteSettings";
import type { AboutDTO, PartnerDTO, ProjectDTO, ServerDTO, ServiceDTO, ToolDTO, WebsiteSettingsDTO } from "@/types";

/**
 * Public read layer. Each read is cached with `use cache` and tagged (see
 * src/lib/cache-tags.ts), so pages are prerendered into the static shell and
 * served without touching MongoDB. An admin write through `adminRoute`
 * invalidates the matching tag, so edits are live on the next page load.
 * `cacheLife("hours")` is only a safety net for changes made outside the admin
 * panel (seed script, direct database edits); it refreshes in the background.
 *
 * A failed read throws inside the cached function, so an error is never cached.
 * `readOrFallback` then defers to request time and retries once, falling back to
 * defaults or empty lists so an outage shows empty states instead of taking
 * down the whole page.
 */
async function readOrFallback<T>(label: string, read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    // During prerendering this postpones the section to request time instead
    // of baking the fallback into the static shell.
    await connection();
    try {
      return await read();
    } catch {
      console.error(`[data] Failed to load ${label}:`, error);
      return fallback;
    }
  }
}

async function cachedSettings(): Promise<WebsiteSettingsDTO> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.settings);
  await connectToDatabase();
  const doc = await WebsiteSettings.findOne({ key: "singleton" }).lean();
  if (!doc) return DEFAULT_SETTINGS;
  const settings = serialize<WebsiteSettingsDTO>(doc);
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    social: { ...DEFAULT_SETTINGS.social, ...settings.social },
  };
}

async function cachedAbout(): Promise<AboutDTO> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.about);
  await connectToDatabase();
  const doc = await About.findOne({ key: "singleton" }).lean();
  return doc ? { ...DEFAULT_ABOUT, ...serialize<AboutDTO>(doc) } : DEFAULT_ABOUT;
}

async function cachedServices(): Promise<ServiceDTO[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.services);
  await connectToDatabase();
  return serializeMany<ServiceDTO>(
    await Service.find({ enabled: true }).sort({ displayOrder: 1, createdAt: 1 }).lean(),
  );
}

async function cachedPartners(): Promise<PartnerDTO[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.partners);
  await connectToDatabase();
  return serializeMany<PartnerDTO>(
    await Partner.find({ enabled: true }).sort({ displayOrder: 1, createdAt: 1 }).lean(),
  );
}

async function cachedTools(): Promise<ToolDTO[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.tools);
  await connectToDatabase();
  return serializeMany<ToolDTO>(
    await Tool.find({ enabled: true }).sort({ displayOrder: 1, createdAt: 1 }).lean(),
  );
}

/**
 * Public server list, with any price given in only one currency converted at the
 * admin's rate. Uncached: the live status widget polls it through /api/servers.
 */
export async function findEnabledServers(): Promise<ServerDTO[]> {
  await connectToDatabase();
  const [servers, settings] = await Promise.all([
    Server.find({ enabled: true }).sort({ displayOrder: 1, createdAt: 1 }).lean(),
    WebsiteSettings.findOne({ key: "singleton" }, { usdToBdtRate: 1 }).lean(),
  ]);
  const rate = settings?.usdToBdtRate ?? DEFAULT_SETTINGS.usdToBdtRate;
  return serializeMany<ServerDTO>(servers).map((server) => withConvertedPrices(server, rate));
}

async function cachedServers(): Promise<ServerDTO[]> {
  "use cache";
  cacheLife("hours");
  // Prices depend on the exchange rate in settings, so a settings save refreshes these too.
  cacheTag(CACHE_TAGS.servers, CACHE_TAGS.settings);
  return findEnabledServers();
}

async function cachedProjects(): Promise<ProjectDTO[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.projects);
  await connectToDatabase();
  return serializeMany<ProjectDTO>(
    await Project.find({ status: "published" }).sort({ displayOrder: 1, createdAt: -1 }).lean(),
  );
}

async function cachedProjectBySlug(slug: string): Promise<ProjectDTO | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.projects);
  await connectToDatabase();
  const doc = await Project.findOne({ slug, status: "published" }).lean();
  return doc ? serialize<ProjectDTO>(doc) : null;
}

export const getSettings = cache(() => readOrFallback("settings", cachedSettings, DEFAULT_SETTINGS));

export const getAbout = cache(() => readOrFallback("about", cachedAbout, DEFAULT_ABOUT));

export const getEnabledServices = cache(() => readOrFallback<ServiceDTO[]>("services", cachedServices, []));

export const getEnabledPartners = cache(() => readOrFallback<PartnerDTO[]>("partners", cachedPartners, []));

export const getEnabledTools = cache(() => readOrFallback<ToolDTO[]>("tools", cachedTools, []));

/** Returns null when the database is unreachable, so the UI never claims a status it cannot know. */
export const getEnabledServers = cache(() =>
  readOrFallback<ServerDTO[] | null>("servers", cachedServers, null),
);

export const getPublishedProjects = cache(() => readOrFallback<ProjectDTO[]>("projects", cachedProjects, []));

export const getPublishedProjectBySlug = cache((slug: string) =>
  readOrFallback<ProjectDTO | null>("project", () => cachedProjectBySlug(slug), null),
);
