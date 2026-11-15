"use client";

import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import type { BannerDTO } from "@/types";

const AUTOPLAY_MS = 5000;
const SWIPE_PX = 40;

function Slide({ banner, active, first }: { banner: BannerDTO; active: boolean; first: boolean }) {
  const hasText = Boolean(banner.title || banner.subtitle);
  const wholeLink = banner.url && !banner.buttonLabel;

  const body = (
    <>
      <SafeImage
        src={banner.image}
        alt={banner.title || "Banner"}
        fill
        priority={first}
        sizes="(min-width: 1280px) 1216px, 100vw"
        className="object-cover"
        draggable={false}
      />
      {hasText && (
        <div className="absolute inset-0 flex items-end bg-linear-to-t from-black/75 via-black/25 to-transparent p-5 sm:items-center sm:bg-linear-to-r sm:from-black/70 sm:via-black/30 sm:p-10">
          <div className="max-w-xl text-white">
            {banner.title && <h3 className="font-display text-xl font-bold sm:text-4xl">{banner.title}</h3>}
            {banner.subtitle && <p className="mt-1.5 text-sm text-white/85 sm:mt-3 sm:text-lg">{banner.subtitle}</p>}
            {banner.url && banner.buttonLabel && (
              <a href={banner.url} tabIndex={active ? undefined : -1} className="btn-neon mt-3 min-h-10! px-5! text-sm sm:mt-5">
                {banner.buttonLabel} <ArrowRight aria-hidden className="size-4" />
              </a>
            )}
          </div>
        </div>
      )}
      {!hasText && banner.url && banner.buttonLabel && (
        <a
          href={banner.url}
          tabIndex={active ? undefined : -1}
          className="btn-neon absolute right-4 bottom-4 min-h-10! px-5! text-sm sm:right-8 sm:bottom-8"
        >
          {banner.buttonLabel} <ArrowRight aria-hidden className="size-4" />
        </a>
      )}
    </>
  );

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-hidden={!active}
      inert={!active}
      className="relative aspect-16/9 w-full shrink-0 sm:aspect-8/3"
    >
      {wholeLink ? (
        <a href={banner.url} aria-label={banner.title || "Open banner"} className="absolute inset-0 block">
          {body}
        </a>
      ) : (
        body
      )}
    </div>
  );
}

export function BannerSlider({ banners }: { banners: BannerDTO[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef<number | null>(null);
  const count = banners.length;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((current) => (current + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [count, paused]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Banners"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") go(index - 1);
        if (event.key === "ArrowRight") go(index + 1);
      }}
      className="neon-card group relative overflow-hidden p-0"
    >
      <div
        className="flex touch-pan-y transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
        onPointerDown={(event) => {
          startX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (startX.current === null) return;
          const delta = event.clientX - startX.current;
          startX.current = null;
          if (Math.abs(delta) > SWIPE_PX) go(index + (delta < 0 ? 1 : -1));
        }}
      >
        {banners.map((banner, slide) => (
          <Slide key={banner.id} banner={banner} active={slide === index} first={slide === 0} />
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous banner"
            onClick={() => go(index - 1)}
            className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next banner"
            onClick={() => go(index + 1)}
            className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((banner, slide) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`Go to banner ${slide + 1}`}
                aria-current={slide === index ? "true" : undefined}
                onClick={() => go(slide)}
                className={`h-2 rounded-full transition-all ${slide === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
