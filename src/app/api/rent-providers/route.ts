import { adminRoute, ApiError, json, readJson } from "@/lib/api";
import { getProviderAccount, ProviderRejectedError, ProviderUnavailableError } from "@/lib/gsm-api";
import { migrateLegacyProvider, toProviderDTO } from "@/lib/providers";
import { encryptSecret } from "@/lib/secret-box";
import { providerSchema } from "@/lib/validations";
import { Provider } from "@/models/Provider";
import { RentService } from "@/models/RentService";

/** Every provider with its service counts. Balances load separately, one per provider. */
export const GET = adminRoute(async () => {
  await migrateLegacyProvider();
  const [providers, counts] = await Promise.all([
    Provider.find({}).select("+apiKeyEncrypted").sort({ displayOrder: 1, createdAt: 1 }).lean(),
    RentService.aggregate<{ _id: unknown; services: number; enabled: number }>([
      { $group: { _id: "$provider", services: { $sum: 1 }, enabled: { $sum: { $cond: ["$enabled", 1, 0] } } } },
    ]),
  ]);
  const byProvider = new Map(counts.map((count) => [String(count._id), count]));
  return json({ providers: providers.map((provider) => toProviderDTO(provider, byProvider.get(String(provider._id)))) });
});

/** Adds a provider after checking the details work. */
export const POST = adminRoute(async (request) => {
  const data = providerSchema.parse(await readJson(request));
  if (!data.key) throw new ApiError(422, "Enter the API key.", undefined, { key: "API key is required" });

  try {
    await getProviderAccount({ url: data.url, username: data.username, key: data.key, useProxy: data.useProxy });
  } catch (error) {
    if (error instanceof ProviderRejectedError || error instanceof ProviderUnavailableError) {
      throw new ApiError(422, `Not saved – the provider did not accept these details: ${error.message}`);
    }
    throw error;
  }

  await migrateLegacyProvider();
  const count = await Provider.countDocuments();
  const provider = await Provider.create({
    name: data.name,
    url: data.url,
    username: data.username,
    apiKeyEncrypted: encryptSecret(data.key),
    useProxy: data.useProxy,
    displayOrder: count,
  });
  return json({ provider: toProviderDTO(provider.toObject()) }, 201);
});
