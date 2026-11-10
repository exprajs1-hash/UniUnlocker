import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteFooter, SiteNavbar } from "@/components/layout/site-chrome";
import { FooterSkeleton, NavbarSkeleton } from "@/components/ui/skeleton";
import { MotionProvider } from "@/components/ui/reveal";
import { getSettings } from "@/lib/data";
import { brandDescription } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { siteName, tagline, heroDescription, favicon } = await getSettings();
  // Brand first: "UniUnlocker – Mobile Solution" is what should match a search for "UniUnlocker".
  const title = tagline ? `${siteName} – ${tagline}` : siteName;
  const description = brandDescription(siteName, heroDescription);
  return {
    title: { default: title, template: `%s | ${siteName}` },
    description,
    icons: favicon ? { icon: favicon } : undefined,
    openGraph: {
      type: "website",
      siteName,
      title,
      description,
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <MotionProvider>
      <div className="site-bg flex min-h-screen flex-col">
        <Suspense fallback={<NavbarSkeleton />}>
          <SiteNavbar />
        </Suspense>
        <main className="flex-1">{children}</main>
        <Suspense fallback={<FooterSkeleton />}>
          <SiteFooter />
        </Suspense>
      </div>
    </MotionProvider>
  );
}
