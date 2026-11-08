import "server-only";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

const DEFAULT_FOLDER = "uniunlocker";

/**
 * Cloudinary folder for uploads, from CLOUDINARY_FOLDER. Nested folders such as
 * "uniunlocker/partners" are allowed; anything unsafe falls back to the default.
 */
export function uploadFolder(): string {
  const folder = (process.env.CLOUDINARY_FOLDER ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/{2,}/g, "/");
  return /^[\w-]+(?:\/[\w-]+)*$/.test(folder) ? folder : DEFAULT_FOLDER;
}

export async function uploadImage(buffer: Buffer, folder = uploadFolder()): Promise<string> {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: "image" }, (error, response) => {
        if (error || !response) reject(error ?? new Error("Empty Cloudinary response"));
        else resolve(response);
      })
      .end(buffer);
  });
  return result.secure_url;
}

const SIGNATURES: Array<{ type: string; bytes: number[]; offset?: number }> = [
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { type: "image/webp", bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  { type: "image/x-icon", bytes: [0x00, 0x00, 0x01, 0x00] },
];

/** Identifies an image from its leading bytes, because the client's MIME type can be spoofed. */
export function detectImageType(buffer: Buffer): string | null {
  const match = SIGNATURES.find(({ bytes, offset = 0 }) =>
    bytes.every((byte, index) => buffer[offset + index] === byte),
  );
  return match?.type ?? null;
}
