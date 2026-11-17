import { adminRoute, ApiError, json, parseObjectId, readJson, type IdContext } from "@/lib/api";
import { getPricing, providerNameMap, toAdminService } from "@/lib/rent";
import { connectToDatabase } from "@/lib/mongodb";
import { isBuiltInCategory } from "@/lib/service-categories";
import { manualServicePatchSchema, rentServicePatchSchema } from "@/lib/validations";
import { RentService } from "@/models/RentService";
import { ServiceCategory } from "@/models/ServiceCategory";

const NOT_FOUND = new ApiError(404, "Service not found.");

/** Keys only a custom (manual) service may change; a provider service gets them from the provider. */
const MANUAL_ONLY_KEYS = ["name", "deliveryTime", "customFields"];

export const PATCH = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const body = await readJson(request);
  const data = rentServicePatchSchema.parse(body);
  await connectToDatabase();
  const existing = await RentService.findById(id, { manual: 1 }).lean();
  if (!existing) throw NOT_FOUND;

  const sentManualKeys = body && typeof body === "object" && MANUAL_ONLY_KEYS.some((key) => key in body);
  if (sentManualKeys && !existing.manual) throw new ApiError(422, "Only a custom service's name and customer fields can be edited here.");
  const parsedManual = existing.manual ? manualServicePatchSchema.parse(body) : {};
  const manual = {
    ...parsedManual,
    ...(parsedManual.customFields
      ? { customFields: parsedManual.customFields.map((field) => ({ ...field, type: field.options.length > 0 ? "select" : "text" })) }
      : {}),
  };
  if (existing.manual && data.priceBdt === null) {
    throw new ApiError(422, "Please check the highlighted fields.", undefined, { priceBdt: "A custom service needs a price" });
  }

  // A custom category must exist, so no service is filed under a page that is not there.
  if (data.category && !isBuiltInCategory(data.category) && !(await ServiceCategory.exists({ slug: data.category }))) {
    throw new ApiError(422, "Please check the highlighted fields.", undefined, { category: "This category no longer exists" });
  }
  const [pricing, names] = await Promise.all([getPricing(), providerNameMap()]);
  const service = await RentService.findByIdAndUpdate(id, { $set: { ...data, ...manual } }, { returnDocument: "after" }).lean();
  if (!service) throw NOT_FOUND;
  return json({ service: toAdminService(service, pricing, names) });
});

/** Deletes a custom service. Provider services are removed by deleting or re-syncing their provider. Past orders are kept. */
export const DELETE = adminRoute<IdContext>(async (_request, { params }) => {
  const id = parseObjectId((await params).id);
  await connectToDatabase();
  const service = await RentService.findById(id, { manual: 1 }).lean();
  if (!service) throw NOT_FOUND;
  if (!service.manual) throw new ApiError(422, "Provider services cannot be deleted here. Turn it off instead.");
  await RentService.deleteOne({ _id: id });
  return json({ ok: true });
});
