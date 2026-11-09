import { adminRoute, json, readJson, requireAdmin, route } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize, serializeMany } from "@/lib/serialize";
import { toolSchema } from "@/lib/validations";
import { Tool } from "@/models/Tool";

/** Public callers only get enabled tools; `?all=1` is admin-only. */
export const GET = route(async (request) => {
  const includeDisabled = new URL(request.url).searchParams.get("all") === "1";
  if (includeDisabled) await requireAdmin(request);

  await connectToDatabase();
  const tools = await Tool.find(includeDisabled ? {} : { enabled: true })
    .sort({ displayOrder: 1, createdAt: 1 })
    .lean();
  return json({ tools: serializeMany(tools) });
});

export const POST = adminRoute(async (request) => {
  const data = toolSchema.parse(await readJson(request));
  await connectToDatabase();
  const tool = await Tool.create(data);
  return json({ tool: serialize(tool.toObject()) }, 201);
});
