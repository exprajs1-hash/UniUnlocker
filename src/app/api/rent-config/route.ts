import { adminRoute, json, readJson } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { getPricing, toRentConfigDTO } from "@/lib/rent";
import { rentConfigSchema } from "@/lib/validations";
import { RentConfig } from "@/models/RentConfig";

export const GET = adminRoute(async () => json({ config: toRentConfigDTO(await getPricing()) }));

export const PUT = adminRoute(async (request) => {
  const data = rentConfigSchema.parse(await readJson(request));
  await connectToDatabase();
  await RentConfig.updateOne({ key: "singleton" }, { $set: data }, { upsert: true });
  return json({ config: toRentConfigDTO(await getPricing()) });
});
