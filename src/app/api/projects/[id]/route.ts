import { adminRoute, ApiError, json, parseObjectId, readJson, type IdContext } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize } from "@/lib/serialize";
import { projectPatchSchema, projectSchema } from "@/lib/validations";
import { Project } from "@/models/Project";
import { slugify } from "@/utils/slug";

const NOT_FOUND = new ApiError(404, "Project not found.");

export const GET = adminRoute<IdContext>(async (_request, { params }) => {
  const id = parseObjectId((await params).id);
  await connectToDatabase();
  const project = await Project.findById(id).lean();
  if (!project) throw NOT_FOUND;
  return json({ project: serialize(project) });
});

export const PUT = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const data = projectSchema.parse(await readJson(request));
  await connectToDatabase();
  const project = await Project.findByIdAndUpdate(
    id,
    { ...data, slug: data.slug || slugify(data.title) },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!project) throw NOT_FOUND;
  return json({ project: serialize(project) });
});

/** Quick toggles from the listing: featured and published/draft. */
export const PATCH = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const data = projectPatchSchema.parse(await readJson(request));
  await connectToDatabase();
  const project = await Project.findByIdAndUpdate(id, data, {
    returnDocument: "after",
    runValidators: true,
  }).lean();
  if (!project) throw NOT_FOUND;
  return json({ project: serialize(project) });
});

export const DELETE = adminRoute<IdContext>(async (_request, { params }) => {
  const id = parseObjectId((await params).id);
  await connectToDatabase();
  const project = await Project.findByIdAndDelete(id).lean();
  if (!project) throw NOT_FOUND;
  return json({ ok: true });
});
