import { adminRoute, json, readJson, route } from "@/lib/api";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize } from "@/lib/serialize";
import { settingsSchema } from "@/lib/validations";
import { WebsiteSettings } from "@/models/WebsiteSettings";
import type { WebsiteSettingsDTO } from "@/types";

export const GET = route(async () => {
  await connectToDatabase();
  const doc = await WebsiteSettings.findOne({ key: "singleton" }).lean();
  if (!doc) return json({ settings: DEFAULT_SETTINGS });
  const settings = serialize<WebsiteSettingsDTO>(doc);
  return json({
    settings: {
      ...DEFAULT_SETTINGS,
      ...settings,
      social: { ...DEFAULT_SETTINGS.social, ...settings.social },
    },
  });
});

export const PUT = adminRoute(async (request) => {
  const data = settingsSchema.parse(await readJson(request));
  await connectToDatabase();
  const settings = await WebsiteSettings.findOneAndUpdate(
    { key: "singleton" },
    { $set: data },
    { upsert: true, returnDocument: "after", runValidators: true },
  ).lean();
  return json({ settings: serialize(settings) });
});
