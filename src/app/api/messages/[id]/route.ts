import { adminRoute, ApiError, json, parseObjectId, readJson, type IdContext } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize } from "@/lib/serialize";
import { messagePatchSchema } from "@/lib/validations";
import { ContactMessage } from "@/models/ContactMessage";

const NOT_FOUND = new ApiError(404, "Message not found.");

export const GET = adminRoute<IdContext>(async (_request, { params }) => {
  const id = parseObjectId((await params).id);
  await connectToDatabase();
  const message = await ContactMessage.findById(id).lean();
  if (!message) throw NOT_FOUND;
  return json({ message: serialize(message) });
});

export const PATCH = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const data = messagePatchSchema.parse(await readJson(request));
  await connectToDatabase();
  const message = await ContactMessage.findByIdAndUpdate(id, data, {
    returnDocument: "after",
  }).lean();
  if (!message) throw NOT_FOUND;
  return json({ message: serialize(message) });
});

export const DELETE = adminRoute<IdContext>(async (_request, { params }) => {
  const id = parseObjectId((await params).id);
  await connectToDatabase();
  const message = await ContactMessage.findByIdAndDelete(id).lean();
  if (!message) throw NOT_FOUND;
  return json({ ok: true });
});
