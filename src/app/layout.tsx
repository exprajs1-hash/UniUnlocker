import type { Metadata, Viewport } from "next";
import { Great_Vibes, Montserrat, Poppins } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { SEO_KEYWORDS, SITE_URL } from "@/lib/seo";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Poppins everywhere: 800 main headings, 700 section headings, 500 body/descriptions, 400 normal text
// (600 is kept for the existing font-semibold labels). Montserrat is the fallback heading font.
const body = Poppins({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const headingAlt = Montserrat({ variable: "--font-heading-alt", subsets: ["latin"], weight: ["700", "800"] });
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
    // suppressHydrationWarning: the theme script may set data-theme on <html> before React hydrates.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${body.variable} ${headingAlt.variable} ${signature.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
