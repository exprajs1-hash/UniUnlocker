import { adminRoute, json, readJson, requireAdmin, route } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize, serializeMany } from "@/lib/serialize";
import { bannerSchema } from "@/lib/validations";
import { Banner } from "@/models/Banner";

/** Public callers only get enabled banners; `?all=1` is admin-only. */
export const GET = route(async (request) => {
  const includeDisabled = new URL(request.url).searchParams.get("all") === "1";
  if (includeDisabled) await requireAdmin(request);

  await connectToDatabase();
  const banners = await Banner.find(includeDisabled ? {} : { enabled: true })
    .sort({ displayOrder: 1, createdAt: 1 })
    .lean();
  return json({ banners: serializeMany(banners) });
});

export const POST = adminRoute(async (request) => {
  const data = bannerSchema.parse(await readJson(request));
  await connectToDatabase();
  const banner = await Banner.create(data);
  return json({ banner: serialize(banner.toObject()) }, 201);
});
