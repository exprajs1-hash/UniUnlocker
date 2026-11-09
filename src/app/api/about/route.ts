import { adminRoute, json, readJson, route } from "@/lib/api";
import { DEFAULT_ABOUT } from "@/lib/defaults";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize } from "@/lib/serialize";
import { aboutPatchSchema, aboutSchema } from "@/lib/validations";
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

export const PATCH = adminRoute(async (request) => {
  const { online } = aboutPatchSchema.parse(await readJson(request));
  await connectToDatabase();
  // If nothing has been saved yet, the new document starts from the default
  // content, so flipping the status does not blank the section.
  const defaultContent: Partial<AboutDTO> = { ...DEFAULT_ABOUT };
  delete defaultContent.online;
  await About.updateOne(
    { key: "singleton" },
    { $set: { online }, $setOnInsert: defaultContent },
    { upsert: true },
  );
  return json({ online });
});
