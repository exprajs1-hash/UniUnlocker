import { Types } from "mongoose";
import { ApiError, json, route, type IdContext } from "@/lib/api";
import { enabledProviderIds } from "@/lib/providers";
import { getPricing, toPublicService } from "@/lib/rent";
import { RentService } from "@/models/RentService";

/** One rentable service for its details page; same visibility rules and fields as the list. */
export const GET = route<IdContext>(async (_request, { params }) => {
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) throw new ApiError(404, "This service is not available.");
  const [pricing, providers] = await Promise.all([getPricing(), enabledProviderIds()]);
  const service = await RentService.findOne({ _id: id, enabled: true, availableOnProvider: true, provider: { $in: providers } }).lean();
  if (!service) throw new ApiError(404, "This service is not available.");
  return json({ service: toPublicService(service, pricing), ordersEnabled: pricing.ordersEnabled });
});
