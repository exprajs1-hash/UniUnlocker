import { adminRoute, ApiError, json } from "@/lib/api";
import { isPexelsConfigured, searchPexels } from "@/lib/pexels";

export const GET = adminRoute(async (request) => {
  if (!isPexelsConfigured()) throw new ApiError(503, "Add PEXELS_API_KEY to search Pexels.");

  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100);
  if (!query) throw new ApiError(400, "Enter something to search for.");

  const photos = await searchPexels(query).catch((error: unknown) => {
    console.error("[pexels]", error);
    throw new ApiError(502, "Pexels could not be reached. Please try again.");
  });
  return json({ photos });
});
