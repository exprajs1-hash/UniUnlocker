import { DEFAULT_USD_TO_BDT } from "@/lib/pricing";
import type { AboutDTO, WebsiteSettingsDTO } from "@/types";

/**
 * Fallback copy shown until the matching singleton exists in MongoDB, or while
 * the database cannot be reached. Lists such as projects and services have no
 * fallback here because they only ever come from the database.
 */
export const DEFAULT_SETTINGS: WebsiteSettingsDTO = {
  siteName: "UniUnlocker",
  tagline: "Mobile Solution",
  logo: "",
  favicon: "",
  heroEyebrow: "Welcome to my portfolio",
  heroTitle: "Mobile Software",
  heroHighlight: "Technician & Developer",
  heroSubtitle: "I fix. I develop. I innovate.",
  heroDescription:
    "Expert in mobile software solutions, unlocking the full potential of your device.",
  heroVideoUrl: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  whatsappNumber: "",
  telegramUsername: "",
  driverUrl: "",
  usdToBdtRate: DEFAULT_USD_TO_BDT,
  social: { facebook: "", youtube: "", linkedin: "", github: "", x: "" },
  footerText: "All rights reserved.",
};

export const DEFAULT_ABOUT: AboutDTO = {
  title: "About Me",
  description:
    "I am a Mobile Software Technician & Developer with hands-on experience in mobile software solutions. I specialize in mobile repair, unlocking, software troubleshooting and app development.",
  image: "/images/about.png",
  profileImage: "",
  experience: "Hands-on mobile software experience",
  signature: "UniUnlocker",
  skills: ["Android", "iOS", "Firmware", "Software Troubleshooting", "App Development"],
  features: ["Expert in Android & iOS", "Fast & Reliable Service", "Client Satisfaction First"],
};
