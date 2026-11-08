import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { DEFAULT_ABOUT, DEFAULT_SETTINGS } from "@/lib/defaults";
import { connectToDatabase } from "@/lib/mongodb";
import { withConvertedPrices } from "@/lib/pricing";
import { serialize, serializeMany } from "@/lib/serialize";
import { About } from "@/models/About";
import { Partner } from "@/models/Partner";
import { Project } from "@/models/Project";
import { Server } from "@/models/Server";
import { Service } from "@/models/Service";
import { WebsiteSettings } from "@/models/WebsiteSettings";
import type { AboutDTO, PartnerDTO, ProjectDTO, ServerDTO, ServiceDTO, WebsiteSettingsDTO } from "@/types";

/**
 * Public read layer. Everything is read from MongoDB at request time, so admin
 * edits are live on the next page load with no revalidation step and no stale
 * copy on any serverless instance. `connection()` keeps these reads out of the
 * build-time prerender, and React `cache` shares one query per request.
 *
 * A database failure falls back to defaults or empty lists, so an outage shows
 * empty states on the affected sections instead of taking down the whole page.
 */
async function readOrFallback<T>(label: string, read: () => Promise<T>, fallback: T): Promise<T> {
  await connection();
  try {
    await connectToDatabase();
    return await read();
  } catch (error) {
    console.error(`[data] Failed to load ${label}:`, error);
    return fallback;
  }
}

export const getSettings = cache(() =>
  readOrFallback<WebsiteSettingsDTO>(
    "settings",
    async () => {
      const doc = await WebsiteSettings.findOne({ key: "singleton" }).lean();
      if (!doc) return DEFAULT_SETTINGS;
      const settings = serialize<WebsiteSettingsDTO>(doc);
      return {
        ...DEFAULT_SETTINGS,
        ...settings,
        social: { ...DEFAULT_SETTINGS.social, ...settings.social },
      };
    },
    DEFAULT_SETTINGS,
  ),
);

export const getAbout = cache(() =>
  readOrFallback<AboutDTO>(
    "about",
    async () => {
      const doc = await About.findOne({ key: "singleton" }).lean();
      return doc ? { ...DEFAULT_ABOUT, ...serialize<AboutDTO>(doc) } : DEFAULT_ABOUT;
    },
    DEFAULT_ABOUT,
  ),
);

export const getEnabledServices = cache(() =>
  readOrFallback<ServiceDTO[]>(
    "services",
    async () =>
      serializeMany<ServiceDTO>(
        await Service.find({ enabled: true }).sort({ displayOrder: 1, createdAt: 1 }).lean(),
      ),
    [],
  ),
);

export const getEnabledPartners = cache(() =>
  readOrFallback<PartnerDTO[]>(
    "partners",
    async () =>
      serializeMany<PartnerDTO>(
        await Partner.find({ enabled: true }).sort({ displayOrder: 1, createdAt: 1 }).lean(),
      ),
    [],
  ),
);

/** Public server list, with any price given in only one currency converted at the admin's rate. */
export async function findEnabledServers(): Promise<ServerDTO[]> {
  await connectToDatabase();
  const [servers, settings] = await Promise.all([
    Server.find({ enabled: true }).sort({ displayOrder: 1, createdAt: 1 }).lean(),
    WebsiteSettings.findOne({ key: "singleton" }, { usdToBdtRate: 1 }).lean(),
  ]);
  const rate = settings?.usdToBdtRate ?? DEFAULT_SETTINGS.usdToBdtRate;
  return serializeMany<ServerDTO>(servers).map((server) => withConvertedPrices(server, rate));
}

/** Returns null when the database is unreachable, so the UI never claims a status it cannot know. */
export const getEnabledServers = cache(() =>
  readOrFallback<ServerDTO[] | null>("servers", findEnabledServers, null),
);

export const getPublishedProjects = cache(() =>
  readOrFallback<ProjectDTO[]>(
    "projects",
    async () =>
      serializeMany<ProjectDTO>(
        await Project.find({ status: "published" }).sort({ displayOrder: 1, createdAt: -1 }).lean(),
      ),
    [],
  ),
);

export const getPublishedProjectBySlug = cache((slug: string) =>
  readOrFallback<ProjectDTO | null>(
    "project",
    async () => {
      const doc = await Project.findOne({ slug, status: "published" }).lean();
      return doc ? serialize<ProjectDTO>(doc) : null;
    },
    null,
  ),
);
