import { adminRoute, ApiError, json, parseObjectId, readJson, type IdContext } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize } from "@/lib/serialize";
import { partnerPatchSchema, partnerSchema } from "@/lib/validations";
import { Partner } from "@/models/Partner";

const NOT_FOUND = new ApiError(404, "Partner not found.");

export const PUT = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const data = partnerSchema.parse(await readJson(request));
  await connectToDatabase();
  const partner = await Partner.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  }).lean();
  if (!partner) throw NOT_FOUND;
  return json({ partner: serialize(partner) });
});

export const PATCH = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const data = partnerPatchSchema.parse(await readJson(request));
  await connectToDatabase();
  const partner = await Partner.findByIdAndUpdate(id, data, { returnDocument: "after" }).lean();
  if (!partner) throw NOT_FOUND;
  return json({ partner: serialize(partner) });
});

export const DELETE = adminRoute<IdContext>(async (_request, { params }) => {
  const id = parseObjectId((await params).id);
  await connectToDatabase();
  const partner = await Partner.findByIdAndDelete(id).lean();
  if (!partner) throw NOT_FOUND;
  return json({ ok: true });
});
