import { adminRoute, ApiError, json, readJson } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize } from "@/lib/serialize";
import { BUILT_IN_CATEGORIES, slugify, slugProblem } from "@/lib/service-categories";
import { serviceCategorySchema } from "@/lib/validations";
import { ServiceCategory } from "@/models/ServiceCategory";
import type { ServiceCategoryDTO } from "@/types";

function toDTO(doc: unknown): ServiceCategoryDTO {
  return { ...serialize<ServiceCategoryDTO>(doc), builtIn: false };
}

/** Built-in categories plus every admin-made one (hidden ones too), for the admin panel. */
export const GET = adminRoute(async () => {
  await connectToDatabase();
  const custom = await ServiceCategory.find().sort({ displayOrder: 1, createdAt: 1 }).lean();
  return json({ categories: [...BUILT_IN_CATEGORIES, ...custom.map(toDTO)] });
});

export const POST = adminRoute(async (request) => {
  const data = serviceCategorySchema.parse(await readJson(request));
  const slug = slugify(data.name);
  const problem = slugProblem(slug);
  if (problem) throw new ApiError(422, "Please check the highlighted fields.", undefined, { name: problem });

  await connectToDatabase();
  if (await ServiceCategory.exists({ slug })) {
    throw new ApiError(409, "A category with this name already exists.", undefined, { name: "This name is already used" });
  }
  const category = await ServiceCategory.create({ ...data, slug });
  return json({ category: toDTO(category.toObject()) }, 201);
});
