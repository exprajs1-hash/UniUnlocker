"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { FALLBACK_IMAGE, isOptimizedImageUrl, isUsableImageUrl } from "@/lib/images";

type SafeImageProps = Omit<ImageProps, "src"> & { src: string };

/**
 * next/image with a fallback for images that are missing or fail to load.
 * Links from hosts the optimizer is not configured for load directly instead.
 */
export function SafeImage({ src, alt, ...props }: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const usable = src && isUsableImageUrl(src) && failedSrc !== src;
  const resolved = usable ? src : FALLBACK_IMAGE;

  return (
    <Image
      {...props}
      src={resolved}
      alt={alt}
      unoptimized={resolved.endsWith(".svg") || !isOptimizedImageUrl(resolved)}
      onError={() => setFailedSrc(src)}
    />
  );
}
