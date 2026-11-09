import { adminRoute, ApiError, json, parseObjectId, readJson, type IdContext } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize } from "@/lib/serialize";
import { toolPatchSchema, toolSchema } from "@/lib/validations";
import { Tool } from "@/models/Tool";

const NOT_FOUND = new ApiError(404, "Tool not found.");

export const PUT = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const data = toolSchema.parse(await readJson(request));
  await connectToDatabase();
  const tool = await Tool.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  }).lean();
  if (!tool) throw NOT_FOUND;
  return json({ tool: serialize(tool) });
});

export const PATCH = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const data = toolPatchSchema.parse(await readJson(request));
  await connectToDatabase();
  const tool = await Tool.findByIdAndUpdate(id, data, { returnDocument: "after" }).lean();
  if (!tool) throw NOT_FOUND;
  return json({ tool: serialize(tool) });
});

export const DELETE = adminRoute<IdContext>(async (_request, { params }) => {
  const id = parseObjectId((await params).id);
  await connectToDatabase();
  const tool = await Tool.findByIdAndDelete(id).lean();
  if (!tool) throw NOT_FOUND;
  return json({ ok: true });
});
