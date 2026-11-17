import { adminRoute, ApiError, json, parseObjectId, readJson, type IdContext } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize } from "@/lib/serialize";
import { serviceCategoryPatchSchema } from "@/lib/validations";
import { RentService } from "@/models/RentService";
import { ServiceCategory } from "@/models/ServiceCategory";
import type { ServiceCategoryDTO } from "@/types";

const NOT_FOUND = new ApiError(404, "Category not found.");

/** Edit name, description, icon, order or visibility. The slug (URL) stays the same so shared links keep working. */
export const PATCH = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const data = serviceCategoryPatchSchema.parse(await readJson(request));
  await connectToDatabase();
  const category = await ServiceCategory.findByIdAndUpdate(id, { $set: data }, { returnDocument: "after" }).lean();
  if (!category) throw NOT_FOUND;
  return json({ category: { ...serialize<ServiceCategoryDTO>(category), builtIn: false } });
});

/** Deletes the category; its services go back to "Auto" (their detected built-in category). */
export const DELETE = adminRoute<IdContext>(async (_request, { params }) => {
  const id = parseObjectId((await params).id);
  await connectToDatabase();
  const category = await ServiceCategory.findByIdAndDelete(id).lean();
  if (!category) throw NOT_FOUND;
  const moved = await RentService.updateMany({ category: category.slug }, { $set: { category: "" } });
  return json({ ok: true, movedServices: moved.modifiedCount });
});
