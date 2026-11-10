import type { Metadata, Viewport } from "next";
import { Great_Vibes, Inter, Sora } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { SEO_KEYWORDS, SITE_URL } from "@/lib/seo";
import "./globals.css";

const body = Inter({ variable: "--font-body", subsets: ["latin"] });
const heading = Sora({ variable: "--font-heading", subsets: ["latin"] });
const signature = Great_Vibes({ variable: "--font-signature", subsets: ["latin"], weight: "400" });

const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const bingVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "UniUnlocker Mobile Solution",
  applicationName: "UniUnlocker",
  keywords: SEO_KEYWORDS,
  creator: "UniUnlocker",
  publisher: "UniUnlocker",
  formatDetection: { telephone: false, email: false, address: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  verification: {
    ...(googleVerification ? { google: googleVerification } : {}),
    ...(bingVerification ? { other: { "msvalidate.01": bingVerification } } : {}),
  },
};

export const viewport: Viewport = { themeColor: "#030817" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} ${signature.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
