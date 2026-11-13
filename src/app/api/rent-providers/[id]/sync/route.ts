import { adminRoute, json, parseObjectId, type IdContext } from "@/lib/api";
import { syncProvider } from "@/lib/providers";

/** Pulls this provider's service list in. New services start hidden. */
export const POST = adminRoute<IdContext>(async (_request, { params }) => {
  const id = parseObjectId((await params).id);
  return json(await syncProvider(id));
});
