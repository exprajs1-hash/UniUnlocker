import { Schema, model, models, type Model } from "mongoose";
import type { AboutDTO } from "@/types";

export type IAbout = AboutDTO & { key: string };

const AboutSchema = new Schema<IAbout>(
  {
    key: { type: String, default: "singleton", unique: true },
    title: String,
    description: String,
    image: String,
    profileImage: String,
    experience: String,
    signature: String,
    skills: [String],
    features: [String],
    online: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const About: Model<IAbout> = models.About || model<IAbout>("About", AboutSchema);
