import { Schema, model, models, type Model } from "mongoose";
import { PROJECT_STATUSES, type ProjectStatus } from "@/types";

export interface IProject {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  category: string;
  image: string;
  projectUrl: string;
  featured: boolean;
  status: ProjectStatus;
  displayOrder: number;
}

const ProjectSchema = new Schema<IProject>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    shortDescription: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    category: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    projectUrl: { type: String, default: "" },
    featured: { type: Boolean, default: false },
    status: { type: String, enum: PROJECT_STATUSES, default: "draft" },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);
ProjectSchema.index({ status: 1, displayOrder: 1 });

export const Project: Model<IProject> =
  models.Project || model<IProject>("Project", ProjectSchema);
