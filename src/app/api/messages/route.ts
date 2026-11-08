import { adminRoute, ApiError, json, readJson, route } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";
import { serializeMany } from "@/lib/serialize";
import { contactSchema } from "@/lib/validations";
import { ContactMessage } from "@/models/ContactMessage";

const MAX_MESSAGES = 5;
const WINDOW_SECONDS = 10 * 60;

export const GET = adminRoute(async () => {
  await connectToDatabase();
  const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(500).lean();
  return json({ messages: serializeMany(messages) });
});

/** The public contact form. */
export const POST = route(async (request) => {
  const { website, ...data } = contactSchema.parse(await readJson(request));

  // Bots get a normal-looking success, so they have no signal to adapt to.
  if (website) return json({ ok: true }, 201);

  const limit = await consumeRateLimit("contact", clientIp(request), MAX_MESSAGES, WINDOW_SECONDS);
  if (!limit.allowed) {
    throw new ApiError(429, "Too many messages sent. Please try again in a few minutes.", {
      "Retry-After": String(limit.retryAfter),
    });
  }

  await connectToDatabase();
  await ContactMessage.create(data);
  return json({ ok: true }, 201);
});
