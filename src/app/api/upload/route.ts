import { adminRoute, ApiError, json } from "@/lib/api";
import { detectImageType, isCloudinaryConfigured, uploadImage } from "@/lib/cloudinary";
import { isPexelsConfigured } from "@/lib/pexels";

const MAX_BYTES = 5 * 1024 * 1024;

/** Tells the admin image field which sources are available. */
export const GET = adminRoute(async () =>
  json({ uploads: isCloudinaryConfigured(), pexels: isPexelsConfigured() }),
);

export const POST = adminRoute(async (request) => {
  if (!isCloudinaryConfigured()) {
    throw new ApiError(
      503,
      "Image uploads are not set up yet. Add your Cloudinary keys to the environment variables.",
    );
  }

  // Multipart overhead is small, so this rejects oversized bodies before they are read.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES + 1024 * 64) {
    throw new ApiError(413, "Images must be 5 MB or smaller.");
  }

  const form = await request.formData().catch(() => {
    throw new ApiError(400, "Send the image as multipart form data.");
  });
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Choose an image to upload.");
  if (file.size > MAX_BYTES) throw new ApiError(413, "Images must be 5 MB or smaller.");

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!detectImageType(buffer)) {
    throw new ApiError(415, "Use a JPG, PNG, WebP, GIF or ICO image.");
  }

  const url = await uploadImage(buffer).catch((error: unknown) => {
    console.error("[upload]", error);
    throw new ApiError(502, explainUploadError(error));
  });
  return json({ url }, 201);
});

/**
 * Turns Cloudinary's refusal into something the admin can act on. Only admins
 * reach this route, and long tokens are masked so no key is ever echoed back.
 */
function explainUploadError(error: unknown): string {
  const raw = String((error as { message?: unknown })?.message ?? "");
  const message = raw.toLowerCase();
  if (message.includes("invalid signature")) {
    return "Cloudinary rejected the upload: CLOUDINARY_API_SECRET is wrong.";
  }
  if (message.includes("api_key") || message.includes("api key")) {
    return "Cloudinary rejected the upload: CLOUDINARY_API_KEY is wrong.";
  }
  if (message.includes("disabled")) {
    return "Cloudinary rejected the upload: the account is disabled or CLOUDINARY_CLOUD_NAME is wrong.";
  }
  if (message.includes("cloud_name") || message.includes("cloud name")) {
    return "Cloudinary rejected the upload: CLOUDINARY_CLOUD_NAME is wrong.";
  }
  const detail = raw.replace(/[A-Za-z0-9_-]{16,}/g, "[hidden]").slice(0, 160);
  return detail
    ? `The image host rejected the upload: ${detail}`
    : "The image host rejected the upload. Please try again.";
}
