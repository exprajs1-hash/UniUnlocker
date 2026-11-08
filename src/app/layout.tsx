import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const body = Inter({ variable: "--font-body", subsets: ["latin"] });
const heading = Sora({ variable: "--font-heading", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "UniUnlocker Mobile Solution",
};

export const viewport: Viewport = { themeColor: "#030817" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
