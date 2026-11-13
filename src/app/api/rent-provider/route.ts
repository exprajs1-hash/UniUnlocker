import { adminRoute, ApiError, json, readJson } from "@/lib/api";
import {
  getProviderAccount,
  getProviderSettings,
  ProviderRejectedError,
  ProviderUnavailableError,
} from "@/lib/gsm-api";
import { connectToDatabase } from "@/lib/mongodb";
import { decryptSecret, encryptSecret } from "@/lib/secret-box";
import { providerSettingsSchema } from "@/lib/validations";
import { RentConfig } from "@/models/RentConfig";

function isProviderError(error: unknown): error is Error {
  return error instanceof ProviderRejectedError || error instanceof ProviderUnavailableError;
}

/** The saved connection (key masked) and the admin's credit with the provider. */
export const GET = adminRoute(async () => {
  const settings = await getProviderSettings();
  try {
    return json({ settings, account: await getProviderAccount(), accountError: null });
  } catch (error) {
    if (!isProviderError(error)) throw error;
    return json({ settings, account: null, accountError: error.message });
  }
});

/**
 * Saves new provider details. They are tested first, so a typo cannot break
 * live ordering. A blank key keeps the current one.
 */
export const PUT = adminRoute(async (request) => {
  const data = providerSettingsSchema.parse(await readJson(request));
  await connectToDatabase();

  let key = data.key;
  if (!key) {
    const current = await RentConfig.findOne({ key: "singleton" }).select("+apiKeyEncrypted").lean();
    key = (current?.apiKeyEncrypted && decryptSecret(current.apiKeyEncrypted)) || process.env.GSM_API_KEY || "";
    if (!key) throw new ApiError(422, "Enter the API key.", undefined, { key: "API key is required" });
  }

  let account;
  try {
    account = await getProviderAccount({ url: data.url, username: data.username, key });
  } catch (error) {
    if (!isProviderError(error)) throw error;
    throw new ApiError(422, `Not saved – the provider did not accept these details: ${error.message}`);
  }

  await RentConfig.updateOne(
    { key: "singleton" },
    { $set: { apiUrl: data.url, apiUsername: data.username, apiKeyEncrypted: encryptSecret(key) } },
    { upsert: true },
  );
  return json({ settings: await getProviderSettings(), account, accountError: null });
});
