import { adminRoute, json, readJson } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { applyOrder } from "@/lib/reorder";
import { reorderSchema } from "@/lib/validations";
import { Banner } from "@/models/Banner";

export const POST = adminRoute(async (request) => {
  const { ids } = reorderSchema.parse(await readJson(request));
  await connectToDatabase();
  await applyOrder(Banner, ids);
  return json({ ok: true });
});
