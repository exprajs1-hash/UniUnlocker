import { adminRoute, json, readJson, requireAdmin, route } from "@/lib/api";
import { findEnabledServers } from "@/lib/data";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize, serializeMany } from "@/lib/serialize";
import { computeOverallStatus } from "@/lib/server-status";
import { serverSchema } from "@/lib/validations";
import { Server } from "@/models/Server";

/**
 * The public status widget polls this endpoint. It returns enabled servers and
 * the derived overall status; `?all=1` is the admin-only full list.
 */
export const GET = route(async (request) => {
  if (new URL(request.url).searchParams.get("all") === "1") {
    await requireAdmin(request);
    await connectToDatabase();
    const servers = await Server.find().sort({ displayOrder: 1, createdAt: 1 }).lean();
    return json({ servers: serializeMany(servers) });
  }

  const servers = await findEnabledServers();
  return json({ servers, overall: computeOverallStatus(servers) });
});

export const POST = adminRoute(async (request) => {
  const data = serverSchema.parse(await readJson(request));
  await connectToDatabase();
  const server = await Server.create({ ...data, statusUpdatedAt: new Date() });
  return json({ server: serialize(server.toObject()) }, 201);
});
