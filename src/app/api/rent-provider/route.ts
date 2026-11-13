import { adminRoute, ApiError, json } from "@/lib/api";
import { getProviderAccount, ProviderRejectedError, ProviderUnavailableError } from "@/lib/gsm-api";

/** The admin's credit with the provider, so they know when to top it up. */
export const GET = adminRoute(async () => {
  try {
    return json({ account: await getProviderAccount() });
  } catch (error) {
    if (error instanceof ProviderRejectedError || error instanceof ProviderUnavailableError) {
      throw new ApiError(502, error.message);
    }
    throw error;
  }
});
