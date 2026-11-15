import { adminRoute, ApiError, json, parseObjectId, readJson, type IdContext } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize } from "@/lib/serialize";
import { bannerPatchSchema, bannerSchema } from "@/lib/validations";
import { Banner } from "@/models/Banner";

const NOT_FOUND = new ApiError(404, "Banner not found.");

export const PUT = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const data = bannerSchema.parse(await readJson(request));
  await connectToDatabase();
  const banner = await Banner.findByIdAndUpdate(id, data, { returnDocument: "after", runValidators: true }).lean();
  if (!banner) throw NOT_FOUND;
  return json({ banner: serialize(banner) });
});

export const PATCH = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const data = bannerPatchSchema.parse(await readJson(request));
  await connectToDatabase();
  const banner = await Banner.findByIdAndUpdate(id, data, { returnDocument: "after" }).lean();
  if (!banner) throw NOT_FOUND;
  return json({ banner: serialize(banner) });
});

export const DELETE = adminRoute<IdContext>(async (_request, { params }) => {
  const id = parseObjectId((await params).id);
  await connectToDatabase();
  const banner = await Banner.findByIdAndDelete(id).lean();
  if (!banner) throw NOT_FOUND;
  return json({ ok: true });
});
