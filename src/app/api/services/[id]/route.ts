import { adminRoute, ApiError, json, parseObjectId, readJson, type IdContext } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize } from "@/lib/serialize";
import { servicePatchSchema, serviceSchema } from "@/lib/validations";
import { Service } from "@/models/Service";

const NOT_FOUND = new ApiError(404, "Service not found.");

export const PUT = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const data = serviceSchema.parse(await readJson(request));
  await connectToDatabase();
  const service = await Service.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  }).lean();
  if (!service) throw NOT_FOUND;
  return json({ service: serialize(service) });
});

export const PATCH = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const data = servicePatchSchema.parse(await readJson(request));
  await connectToDatabase();
  const service = await Service.findByIdAndUpdate(id, data, { returnDocument: "after" }).lean();
  if (!service) throw NOT_FOUND;
  return json({ service: serialize(service) });
});

export const DELETE = adminRoute<IdContext>(async (_request, { params }) => {
  const id = parseObjectId((await params).id);
  await connectToDatabase();
  const service = await Service.findByIdAndDelete(id).lean();
  if (!service) throw NOT_FOUND;
  return json({ ok: true });
});
