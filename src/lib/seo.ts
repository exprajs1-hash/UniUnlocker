import type { WebsiteSettingsDTO } from "@/types";

/** Absolute public URL of the site, without a trailing slash. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Spellings people type into Google when looking for the brand. */
export const BRAND_ALIASES = ["UniUnlocker", "Uniunlocker", "Uni Unlocker", "Uni-Unlocker"];

export const SEO_KEYWORDS = [
  ...BRAND_ALIASES,
  "UniUnlocker Mobile Solution",
  "mobile unlock service",
  "FRP bypass",
  "IMEI repair",
  "mobile software solution",
  "phone unlocking",
  "Xiaomi unlock",
  "Vivo unlock",
  "Realme unlock",
  "Honor unlock",
  "unlock tool rental",
  "GSM server",
  "Bangladesh mobile unlock",
];

/** A description that always names the brand, so Google ties the page to "UniUnlocker". */
export function brandDescription(siteName: string, description: string) {
  const text = description.trim();
  if (!text) return `${siteName} – mobile software solution: unlocking, FRP, IMEI, repair and tool rental.`;
  return text.toLowerCase().includes(siteName.toLowerCase()) ? text : `${siteName} – ${text}`;
}

function absolute(url: string) {
  if (!url) return "";
  return /^https?:\/\//.test(url) ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** Organization + WebSite structured data. WebSite.name is what Google shows as the site name. */
export function siteJsonLd(settings: WebsiteSettingsDTO) {
  const { siteName, tagline, logo, heroDescription, contactEmail, contactPhone, social } = settings;
  const sameAs = Object.values(social ?? {}).filter((url): url is string => Boolean(url));
  const alternateName = BRAND_ALIASES.filter((alias) => alias !== siteName);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: siteName,
        alternateName,
        url: `${SITE_URL}/`,
        logo: absolute(logo) || `${SITE_URL}/icon.svg`,
        description: brandDescription(siteName, heroDescription),
        ...(sameAs.length ? { sameAs } : {}),
        ...(contactEmail || contactPhone
          ? {
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer support",
                ...(contactEmail ? { email: contactEmail } : {}),
                ...(contactPhone ? { telephone: contactPhone } : {}),
              },
            }
          : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: siteName,
        alternateName: [tagline ? `${siteName} ${tagline}` : "", ...alternateName].filter(Boolean),
        url: `${SITE_URL}/`,
        inLanguage: "en",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };
}

/** Serialises JSON-LD for a <script> tag, escaping "<" so content cannot break out of it. */
export function toJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
