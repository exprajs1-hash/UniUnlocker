import { adminRoute, ApiError, json, parseObjectId, readJson, type IdContext } from "@/lib/api";
import { getPricing, toAdminService } from "@/lib/rent";
import { rentServicePatchSchema } from "@/lib/validations";
import { RentService } from "@/models/RentService";

export const PATCH = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const data = rentServicePatchSchema.parse(await readJson(request));
  const pricing = await getPricing();
  const service = await RentService.findByIdAndUpdate(id, { $set: data }, { returnDocument: "after" }).lean();
  if (!service) throw new ApiError(404, "Service not found.");
  return json({ service: toAdminService(service, pricing) });
});
