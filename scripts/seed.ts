/**
 * Creates the first admin account and fills empty collections with starter content.
 * Safe to re-run: it never overwrites existing content or an existing admin.
 *
 *   npm run seed                  create the admin and starter content
 *   npm run seed -- --reset-admin also reset the admin password from ADMIN_PASSWORD
 *                                 and sign out all of that admin's sessions
 */
import { loadEnvConfig } from "@next/env";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { DEFAULT_ABOUT, DEFAULT_SETTINGS } from "../src/lib/defaults";
import { pexelsUrl } from "../src/lib/images";
import { connectToDatabase } from "../src/lib/mongodb";
import { isPexelsConfigured, searchPexels } from "../src/lib/pexels";
import { About } from "../src/models/About";
import { Admin } from "../src/models/Admin";
import { ContactMessage } from "../src/models/ContactMessage";
import { Project } from "../src/models/Project";
import { RateLimit } from "../src/models/RateLimit";
import { Server } from "../src/models/Server";
import { Service } from "../src/models/Service";
import { WebsiteSettings } from "../src/models/WebsiteSettings";

loadEnvConfig(process.cwd());

const SERVICES = [
  {
    title: "Mobile Repair & Troubleshooting",
    description: "Diagnosis and repair of software faults, boot loops, crashes and performance issues.",
    icon: "Wrench",
  },
  {
    title: "GSM Software Customization",
    description: "Firmware flashing, updates and tailored software setups for Android and iOS devices.",
    icon: "Cog",
  },
  {
    title: "Unlock & Bypass Service",
    description: "Unlocking and account recovery help for device owners with proof of ownership.",
    icon: "Lock",
  },
  {
    title: "GSM USB Server",
    description: "Reliable server access for GSM tools and remote service work.",
    icon: "Server",
  },
  {
    title: "Custom Solutions",
    description: "Custom tools, utilities and apps built around your specific workflow.",
    icon: "Puzzle",
  },
];

const SERVERS = [
  { name: "Mi FRP", logo: "/brands/mi.svg", status: "online", description: "Xiaomi, Redmi and POCO devices." },
  { name: "Realme FRP", logo: "/brands/realme.svg", status: "online", description: "Realme devices." },
  { name: "Vivo FRP", logo: "/brands/vivo.svg", status: "online", description: "Vivo and iQOO devices." },
  { name: "Honor FRP", logo: "/brands/honor.svg", status: "offline", description: "Honor devices." },
];

// Each photo was opened and checked by hand. With PEXELS_API_KEY set, the search
// query is tried first and these act as the fallback.
const PROJECTS = [
  {
    title: "GSM Software Customization",
    category: "Software",
    query: "technology screen data blue",
    photo: 5380642,
    shortDescription: "Tailored firmware and software setups for GSM devices.",
    description:
      "A customization workflow covering firmware selection, flashing and post-install configuration, so each device runs a stable setup that suits how it is used.",
    featured: true,
  },
  {
    title: "Unlock & Bypass Solution",
    category: "Unlocking",
    query: "smartphone dark",
    photo: 1092644,
    shortDescription: "Device access recovery for verified owners.",
    description:
      "A structured process for helping owners regain access to their own devices, starting with proof of ownership and ending with a tested, working device.",
    featured: true,
  },
  {
    title: "Mobile Repair Service",
    category: "Repair",
    query: "smartphone repair circuit board",
    photo: 6755091,
    shortDescription: "Software and board-level troubleshooting for phones.",
    description:
      "End-to-end troubleshooting for faulty phones, from software diagnostics through to identifying failing components, with clear reporting at each step.",
    featured: false,
  },
  {
    title: "Custom Tools & Utilities",
    category: "Development",
    query: "computer motherboard",
    photo: 2582937,
    shortDescription: "In-house utilities that speed up repetitive service work.",
    description:
      "A set of purpose-built utilities that automate repetitive service tasks, reduce manual errors and keep job turnaround consistent.",
    featured: false,
  },
];

async function chooseImage(query: string, fallbackPhoto: number): Promise<string> {
  if (isPexelsConfigured()) {
    try {
      const [photo] = await searchPexels(query, 1);
      if (photo) return photo.url;
    } catch (error) {
      console.warn(`Pexels search failed for "${query}", using the default photo.`, error);
    }
  }
  return pexelsUrl(fallbackPhoto);
}

async function seedAdmin(resetPassword: boolean): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD before seeding.");
  if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");

  const existing = await Admin.findOne({ email });
  if (existing && !resetPassword) {
    console.log(`Admin ${email} already exists, leaving it unchanged.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.tokenVersion += 1;
    await existing.save();
    console.log(`Reset the password for ${email} and signed out its sessions.`);
  } else {
    await Admin.create({ email, passwordHash });
    console.log(`Created admin ${email}.`);
  }
}

async function seedContent(): Promise<void> {
  if (!(await WebsiteSettings.exists({ key: "singleton" }))) {
    await WebsiteSettings.create({ ...DEFAULT_SETTINGS, key: "singleton" });
    console.log("Created website settings.");
  }
  if (!(await About.exists({ key: "singleton" }))) {
    await About.create({ ...DEFAULT_ABOUT, key: "singleton" });
    console.log("Created About content.");
  }
  if ((await Service.countDocuments()) === 0) {
    await Service.insertMany(SERVICES.map((service, displayOrder) => ({ ...service, displayOrder })));
    console.log(`Created ${SERVICES.length} services.`);
  }
  if ((await Server.countDocuments()) === 0) {
    await Server.insertMany(
      SERVERS.map((server, displayOrder) => ({
        ...server,
        displayOrder,
        statusUpdatedAt: new Date(),
      })),
    );
    console.log(`Created ${SERVERS.length} servers.`);
  }
  if ((await Project.countDocuments()) === 0) {
    const projects = await Promise.all(
      PROJECTS.map(async ({ query, photo, ...project }, displayOrder) => ({
        ...project,
        image: await chooseImage(query, photo),
        slug: project.title
          .toLowerCase()
          .replace(/&/g, "and")
          .replace(/[^a-z0-9]+/g, "-"),
        status: "published",
        displayOrder,
      })),
    );
    await Project.insertMany(projects);
    console.log(`Created ${projects.length} projects.`);
  }
}

async function main(): Promise<void> {
  await connectToDatabase();
  // Builds every index up front, including the unique and TTL ones the app relies on.
  await Promise.all(
    [Admin, Project, Service, Server, About, WebsiteSettings, ContactMessage, RateLimit].map(
      (model) => (model as typeof Admin).init(),
    ),
  );
  await seedAdmin(process.argv.includes("--reset-admin"));
  await seedContent();
  console.log("Seed complete.");
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
