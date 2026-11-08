import { Schema, model, models, type Model } from "mongoose";

export interface IContactMessage {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  read: boolean;
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);
ContactMessageSchema.index({ createdAt: -1 });

export const ContactMessage: Model<IContactMessage> =
  models.ContactMessage || model<IContactMessage>("ContactMessage", ContactMessageSchema);
