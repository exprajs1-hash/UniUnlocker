import { adminRoute, json, readJson, requireAdmin, route } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize, serializeMany } from "@/lib/serialize";
import { partnerSchema } from "@/lib/validations";
import { Partner } from "@/models/Partner";

/** Public callers only get enabled partners; `?all=1` is admin-only. */
export const GET = route(async (request) => {
  const includeDisabled = new URL(request.url).searchParams.get("all") === "1";
  if (includeDisabled) await requireAdmin(request);

  await connectToDatabase();
  const partners = await Partner.find(includeDisabled ? {} : { enabled: true })
    .sort({ displayOrder: 1, createdAt: 1 })
    .lean();
  return json({ partners: serializeMany(partners) });
});

export const POST = adminRoute(async (request) => {
  const data = partnerSchema.parse(await readJson(request));
  await connectToDatabase();
  const partner = await Partner.create(data);
  return json({ partner: serialize(partner.toObject()) }, 201);
});
