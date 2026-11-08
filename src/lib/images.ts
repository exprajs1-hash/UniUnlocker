/** Hosts next/image resizes and compresses. Keep in sync with next.config.ts. */
export const OPTIMIZED_IMAGE_HOSTS = ["images.pexels.com", "res.cloudinary.com"];

export const FALLBACK_IMAGE = "/images/fallback.svg";

function isSitePath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//");
}

function httpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname ? url : null;
  } catch {
    return null;
  }
}

/**
 * Any image the site can show: a path on this site or any https link. Images
 * from other hosts are loaded by the browser as-is rather than through the
 * optimizer, so the optimizer never becomes an open proxy for arbitrary sites.
 */
export function isUsableImageUrl(value: string): boolean {
  return isSitePath(value) || httpsUrl(value) !== null;
}

/** True when next/image can optimize the image (site files and the hosts above). */
export function isOptimizedImageUrl(value: string): boolean {
  if (isSitePath(value)) return true;
  const url = httpsUrl(value);
  return url !== null && OPTIMIZED_IMAGE_HOSTS.includes(url.hostname);
}

export function pexelsUrl(id: number, width = 1200): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}
