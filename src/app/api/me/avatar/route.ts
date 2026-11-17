import { ApiError, json, route } from "@/lib/api";
import { detectImageType, isCloudinaryConfigured, uploadFolder, uploadImage } from "@/lib/cloudinary";
import { requireCustomer } from "@/lib/customer-auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { Customer } from "@/models/Customer";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_UPLOADS_PER_HOUR = 10;
/** Photos only: no GIF (animated) or ICO for a profile picture. */
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** The signed-in customer uploads their own profile picture. */
export const POST = route(async (request) => {
  const customer = await requireCustomer(request);
  if (!isCloudinaryConfigured()) throw new ApiError(503, "Photo upload is not available right now.");

  const limit = await consumeRateLimit("avatar-upload", customer.id, MAX_UPLOADS_PER_HOUR, 60 * 60);
  if (!limit.allowed) {
    throw new ApiError(429, "Too many photo changes. Please try again later.", {
      "Retry-After": String(limit.retryAfter),
    });
  }

  // Rejects oversized bodies before they are read; multipart overhead is small.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES + 64 * 1024) {
    throw new ApiError(413, "The photo must be 2 MB or smaller.");
  }
  const form = await request.formData().catch(() => {
    throw new ApiError(400, "Send the photo as multipart form data.");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Choose a photo to upload.");
  if (file.size > MAX_BYTES) throw new ApiError(413, "The photo must be 2 MB or smaller.");

  // The real type comes from the file's bytes; the name and browser-sent type can be faked.
  const buffer = Buffer.from(await file.arrayBuffer());
  const type = detectImageType(buffer);
  if (!type || !ALLOWED_TYPES.includes(type)) throw new ApiError(415, "Use a JPG, PNG or WebP photo.");

  const url = await uploadImage(buffer, `${uploadFolder()}/avatars`).catch((error: unknown) => {
    console.error("[avatar]", error);
    throw new ApiError(502, "The photo could not be uploaded. Please try again.");
  });
  await Customer.updateOne({ _id: customer.id }, { $set: { avatar: url } });
  return json({ avatar: url }, 201);
});

/** Removes the profile picture; the initial letter shows again. */
export const DELETE = route(async (request) => {
  const customer = await requireCustomer(request);
  await Customer.updateOne({ _id: customer.id }, { $set: { avatar: "" } });
  return json({ avatar: "" });
});
