import { Wrench } from "lucide-react";
import Link from "next/link";
import { HeroCopy, HeroVisual } from "@/components/sections/hero-visual";
import { VideoButton } from "@/components/sections/video-button";
import { getSettings } from "@/lib/data";
import { contactLink } from "@/utils/format";

export async function HeroSection() {
  const settings = await getSettings();
  return (
    <section id="home" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-6 px-5 pt-10 pb-14 lg:grid-cols-[1.25fr_1fr] lg:px-8 lg:pt-16 lg:pb-20">
        <HeroCopy>
          {settings.heroEyebrow && (
            <p className="flex items-center gap-4 text-sm font-medium tracking-[0.18em] text-foreground/90 uppercase">
              {settings.heroEyebrow}
              <span aria-hidden className="h-px w-16 bg-linear-to-r from-cyan to-transparent" />
            </p>
          )}
          <h1 className="mt-5 font-display text-4xl leading-[1.12] font-bold sm:text-5xl xl:text-[3.3rem]">
            {settings.heroTitle}
            {settings.heroHighlight && (
              <span className="text-neon mt-1 block">{settings.heroHighlight}</span>
            )}
          </h1>
          {settings.heroSubtitle && (
            <p className="mt-6 text-xl font-semibold">{settings.heroSubtitle}</p>
          )}
          {settings.heroDescription && (
            <p className="mt-3 max-w-lg text-lg text-muted">{settings.heroDescription}</p>
          )}
          <div className="mt-8 flex flex-wrap gap-4">
            <VideoButton url={settings.heroVideoUrl} contactHref={contactLink(settings)} />
            <Link href="/#services" className="btn-outline">
              <Wrench aria-hidden className="size-5" /> Our Services
            </Link>
          </div>
        </HeroCopy>
        <HeroVisual />
      </div>
    </section>
  );
}
