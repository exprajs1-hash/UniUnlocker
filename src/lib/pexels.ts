import type { PexelsPhoto } from "@/types";

interface PexelsApiPhoto {
  id: number;
  alt?: string;
  photographer: string;
  photographer_url: string;
  src: { large2x: string; medium: string };
}

export function isPexelsConfigured(): boolean {
  return Boolean(process.env.PEXELS_API_KEY);
}

/** Searches Pexels. Only call this from server code, since it uses the private API key. */
export async function searchPexels(query: string, perPage = 15): Promise<PexelsPhoto[]> {
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("orientation", "landscape");

  const response = await fetch(url, {
    headers: { Authorization: process.env.PEXELS_API_KEY ?? "" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Pexels responded with ${response.status}`);

  const body = (await response.json()) as { photos: PexelsApiPhoto[] };
  return body.photos.map((photo) => ({
    id: photo.id,
    url: photo.src.large2x,
    thumb: photo.src.medium,
    alt: photo.alt ?? "",
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
  }));
}
