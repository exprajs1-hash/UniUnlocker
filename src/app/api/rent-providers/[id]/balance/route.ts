import { adminRoute, json, parseObjectId, type IdContext } from "@/lib/api";
import { getProviderAccount, ProviderRejectedError, ProviderUnavailableError } from "@/lib/gsm-api";
import { getProviderCredentials } from "@/lib/providers";

/** The admin's credit with one provider. A provider error is reported, not thrown. */
export const GET = adminRoute<IdContext>(async (_request, { params }) => {
  const id = parseObjectId((await params).id);
  const credentials = await getProviderCredentials(id);
  try {
    return json({ account: await getProviderAccount(credentials), error: null });
  } catch (error) {
    if (error instanceof ProviderRejectedError || error instanceof ProviderUnavailableError) {
      return json({ account: null, error: error.message });
    }
    throw error;
  }
});
