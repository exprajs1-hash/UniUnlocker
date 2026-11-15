import type { Metadata } from "next";
import { Suspense } from "react";
import { AboutSection } from "@/components/sections/about-section";
import { HeroSection } from "@/components/sections/hero-section";
import { PartnersSection } from "@/components/sections/partners-section";
import { PortfolioSection } from "@/components/sections/portfolio-section";
import { ServerStatusSection } from "@/components/sections/server-status-section";
import { BannerSection } from "@/components/sections/banner-section";
import { ToolsSection } from "@/components/sections/tools-section";
import { CardGridSkeleton, HeroSkeleton, SplitSkeleton } from "@/components/ui/skeleton";
import { getSettings } from "@/lib/data";
import { siteJsonLd, toJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** Organization + WebSite structured data, so Google knows this site *is* the brand. */
async function SiteStructuredData() {
  const settings = await getSettings();
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: toJsonLd(siteJsonLd(settings)) }}
    />
  );
}

export default function HomePage() {
  return (
    <>
      <Suspense>
        <SiteStructuredData />
      </Suspense>
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection />
      </Suspense>
      <Suspense>
        <BannerSection />
      </Suspense>
      <Suspense fallback={<SplitSkeleton />}>
        <AboutSection />
      </Suspense>
      <Suspense fallback={<CardGridSkeleton />}>
        <ServerStatusSection />
      </Suspense>
      <Suspense fallback={<CardGridSkeleton height="h-64" />}>
        <PortfolioSection />
      </Suspense>
      <Suspense fallback={<CardGridSkeleton count={5} columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" height="h-32" />}>
        <ToolsSection />
      </Suspense>
      <Suspense fallback={<CardGridSkeleton count={5} columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" height="h-32" />}>
        <PartnersSection />
      </Suspense>
    </>
  );
}
