import { adminRoute, ApiError, json, parseObjectId, readJson, type IdContext } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize } from "@/lib/serialize";
import { serverPatchSchema, serverSchema } from "@/lib/validations";
import { Server, type IServer } from "@/models/Server";

/** Applies changes and only moves "last updated" when the status itself changed. */
async function applyChanges(id: string, changes: Partial<IServer>) {
  await connectToDatabase();
  const server = await Server.findById(id);
  if (!server) throw new ApiError(404, "Server not found.");
  if (changes.status && changes.status !== server.status) {
    server.statusUpdatedAt = new Date();
  }
  server.set(changes);
  await server.save();
  return json({ server: serialize(server.toObject()) });
}

export const PUT = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  return applyChanges(id, serverSchema.parse(await readJson(request)));
});

export const PATCH = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  return applyChanges(id, serverPatchSchema.parse(await readJson(request)));
});

export const DELETE = adminRoute<IdContext>(async (_request, { params }) => {
  const id = parseObjectId((await params).id);
  await connectToDatabase();
  const server = await Server.findByIdAndDelete(id).lean();
  if (!server) throw new ApiError(404, "Server not found.");
  return json({ ok: true });
});
