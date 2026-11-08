import { adminRoute, json, readJson, route } from "@/lib/api";
import { DEFAULT_ABOUT } from "@/lib/defaults";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize } from "@/lib/serialize";
import { aboutSchema } from "@/lib/validations";
import { About } from "@/models/About";
import type { AboutDTO } from "@/types";

export const GET = route(async () => {
  await connectToDatabase();
  const about = await About.findOne({ key: "singleton" }).lean();
  return json({ about: about ? { ...DEFAULT_ABOUT, ...serialize<AboutDTO>(about) } : DEFAULT_ABOUT });
});

export const PUT = adminRoute(async (request) => {
  const data = aboutSchema.parse(await readJson(request));
  await connectToDatabase();
  const about = await About.findOneAndUpdate(
    { key: "singleton" },
    { $set: data },
    { upsert: true, returnDocument: "after", runValidators: true },
  ).lean();
  return json({ about: serialize(about) });
});
