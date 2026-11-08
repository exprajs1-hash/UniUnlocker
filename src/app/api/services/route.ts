import { adminRoute, json, readJson, requireAdmin, route } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize, serializeMany } from "@/lib/serialize";
import { serviceSchema } from "@/lib/validations";
import { Service } from "@/models/Service";

/** Public callers only get enabled services; `?all=1` is admin-only. */
export const GET = route(async (request) => {
  const includeDisabled = new URL(request.url).searchParams.get("all") === "1";
  if (includeDisabled) await requireAdmin(request);

  await connectToDatabase();
  const services = await Service.find(includeDisabled ? {} : { enabled: true })
    .sort({ displayOrder: 1, createdAt: 1 })
    .lean();
  return json({ services: serializeMany(services) });
});

export const POST = adminRoute(async (request) => {
  const data = serviceSchema.parse(await readJson(request));
  await connectToDatabase();
  const service = await Service.create(data);
  return json({ service: serialize(service.toObject()) }, 201);
});
