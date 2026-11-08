const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

/** Stable on server and client, so it is safe to render during hydration. */
export function formatDateTimeUtc(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "Unknown" : `${dateTime.format(date)} UTC`;
}

export function formatRelative(iso: string, now: number): string {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (Number.isNaN(seconds)) return "Unknown";
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDateTimeUtc(iso);
}

/** Returns an embeddable URL for YouTube links, or null for anything else. */
export function youtubeEmbedUrl(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") {
      id = url.pathname.slice(1);
    } else if (["youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) {
      id =
        url.searchParams.get("v") ??
        url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1] ??
        null;
    }
    return id && /^[\w-]{6,20}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
      : null;
  } catch {
    return null;
  }
}

export function whatsappLink(number: string, text?: string): string {
  const digits = number.replace(/\D/g, "");
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}

export type Currency = "BDT" | "USD";

const amountFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** Fixed locale, so server and client render the same text. */
export function formatPrice(amount: number, currency: Currency): string {
  return `${currency === "USD" ? "$" : "৳"}${amountFormat.format(amount)}`;
}

export function telegramLink(username: string): string {
  return `https://t.me/${username.replace(/^@/, "")}`;
}

/** Best way to reach the owner from site settings: WhatsApp first, then email; null if neither is set. */
export function contactLink(settings: { whatsappNumber: string; contactEmail: string; siteName: string }): string | null {
  if (settings.whatsappNumber.replace(/\D/g, "")) {
    return whatsappLink(settings.whatsappNumber, `Hi ${settings.siteName}, I'd like to hire you.`);
  }
  return settings.contactEmail ? `mailto:${settings.contactEmail}` : null;
}
