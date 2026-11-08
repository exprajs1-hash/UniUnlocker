import { Suspense } from "react";
import { AboutSection } from "@/components/sections/about-section";
import { HeroSection } from "@/components/sections/hero-section";
import { PartnersSection } from "@/components/sections/partners-section";
import { PortfolioSection } from "@/components/sections/portfolio-section";
import { ServerStatusSection } from "@/components/sections/server-status-section";
import { ServicesSection } from "@/components/sections/services-section";
import { CardGridSkeleton, HeroSkeleton, SplitSkeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  return (
    <>
      <Suspense fallback={<HeroSkeleton />}>
        <HeroSection />
      </Suspense>
      <Suspense fallback={<CardGridSkeleton count={5} columns="sm:grid-cols-2 lg:grid-cols-5" />}>
        <ServicesSection />
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
        <PartnersSection />
      </Suspense>
    </>
  );
}
