import { adminRoute, ApiError, json, parseObjectId, readJson, type IdContext } from "@/lib/api";
import { getProviderAccount, ProviderRejectedError, ProviderUnavailableError } from "@/lib/gsm-api";
import { connectToDatabase } from "@/lib/mongodb";
import { credentialsOf, toProviderDTO } from "@/lib/providers";
import { encryptSecret } from "@/lib/secret-box";
import { providerPatchSchema, providerSchema } from "@/lib/validations";
import { Provider } from "@/models/Provider";
import { RentOrder } from "@/models/RentOrder";
import { RentService } from "@/models/RentService";

const NOT_FOUND = new ApiError(404, "Provider not found.");

/** Edits a provider. The new details are tested first; a blank key keeps the saved one. */
export const PUT = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const data = providerSchema.parse(await readJson(request));
  await connectToDatabase();
  const current = await Provider.findById(id).select("+apiKeyEncrypted").lean();
  if (!current) throw NOT_FOUND;

  const key = data.key || credentialsOf(current).key;
  if (!key) throw new ApiError(422, "Enter the API key.", undefined, { key: "API key is required" });

  try {
    await getProviderAccount({ url: data.url, username: data.username, key });
  } catch (error) {
    if (error instanceof ProviderRejectedError || error instanceof ProviderUnavailableError) {
      throw new ApiError(422, `Not saved – the provider did not accept these details: ${error.message}`);
    }
    throw error;
  }

  const provider = await Provider.findByIdAndUpdate(
    id,
    { $set: { name: data.name, url: data.url, username: data.username, apiKeyEncrypted: encryptSecret(key) } },
    { returnDocument: "after" },
  )
    .select("+apiKeyEncrypted")
    .lean();
  if (!provider) throw NOT_FOUND;
  return json({ provider: toProviderDTO(provider) });
});

/** Turns a provider on or off. Off hides its services and blocks new orders. */
export const PATCH = adminRoute<IdContext>(async (request, { params }) => {
  const id = parseObjectId((await params).id);
  const { enabled } = providerPatchSchema.parse(await readJson(request));
  await connectToDatabase();
  const provider = await Provider.findByIdAndUpdate(id, { $set: { enabled } }, { returnDocument: "after" })
    .select("+apiKeyEncrypted")
    .lean();
  if (!provider) throw NOT_FOUND;
  return json({ provider: toProviderDTO(provider) });
});

/**
 * Deletes a provider and its synced services. Refused while it still has open
 * orders, since those need the provider to finish or be checked.
 */
export const DELETE = adminRoute<IdContext>(async (_request, { params }) => {
  const id = parseObjectId((await params).id);
  await connectToDatabase();
  const open = await RentOrder.exists({ provider: id, status: { $in: ["submitting", "pending", "processing"] } });
  if (open) {
    throw new ApiError(409, "This provider still has open orders. Wait for them to finish (or refund them), or turn the provider off instead.");
  }
  const provider = await Provider.findByIdAndDelete(id).lean();
  if (!provider) throw NOT_FOUND;
  await RentService.deleteMany({ provider: id });
  return json({ ok: true });
});
