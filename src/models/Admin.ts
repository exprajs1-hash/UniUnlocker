import { Schema, model, models, type Model } from "mongoose";

export interface IAdmin {
  email: string;
  name: string;
  passwordHash: string;
  /** Bumped when the password is reset, which invalidates existing sessions. */
  tokenVersion: number;
}

const AdminSchema = new Schema<IAdmin>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: "Administrator", trim: true },
    passwordHash: { type: String, required: true, select: false },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Admin: Model<IAdmin> = models.Admin || model<IAdmin>("Admin", AdminSchema);
