import { adminRoute, json, readJson, requireAdmin, route } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize, serializeMany } from "@/lib/serialize";
import { projectSchema } from "@/lib/validations";
import { Project } from "@/models/Project";
import { slugify } from "@/utils/slug";

/** Public callers only ever get published projects; `?all=1` is admin-only. */
export const GET = route(async (request) => {
  const includeDrafts = new URL(request.url).searchParams.get("all") === "1";
  if (includeDrafts) await requireAdmin(request);

  await connectToDatabase();
  const projects = await Project.find(includeDrafts ? {} : { status: "published" })
    .sort({ displayOrder: 1, createdAt: -1 })
    .lean();
  return json({ projects: serializeMany(projects) });
});

async function nextAvailableSlug(base: string): Promise<string> {
  const root = base || "project";
  let candidate = root;
  for (let suffix = 2; await Project.exists({ slug: candidate }); suffix += 1) {
    candidate = `${root}-${suffix}`;
  }
  return candidate;
}

export const POST = adminRoute(async (request) => {
  const data = projectSchema.parse(await readJson(request));
  await connectToDatabase();

  // A typed slug must be unique (the index reports conflicts); a generated one adapts.
  const slug = data.slug || (await nextAvailableSlug(slugify(data.title)));
  const project = await Project.create({ ...data, slug });
  return json({ project: serialize(project.toObject()) }, 201);
});
