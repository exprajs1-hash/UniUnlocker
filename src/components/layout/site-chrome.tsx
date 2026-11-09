import Link from "next/link";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Navbar } from "@/components/layout/navbar";
import { SocialLinkList } from "@/components/ui/social-icons";
import { getSettings } from "@/lib/data";
import { telegramLink, whatsappLink } from "@/utils/format";

export async function SiteNavbar() {
  const settings = await getSettings();
  const { siteName, tagline, logo } = settings;
  return (
    <Navbar
      brand={<BrandLogo siteName={siteName} tagline={tagline} logo={logo} />}
      actions={{
        utilityLinks: settings.utilityLinks,
        whatsappUrl: settings.whatsappNumber.replace(/\D/g, "")
          ? whatsappLink(settings.whatsappNumber, `Hi ${siteName}, I'd like to hire you.`)
          : null,
        telegramUrl: settings.telegramUsername ? telegramLink(settings.telegramUsername) : null,
      }}
    />
  );
}

export async function SiteFooter() {
  const { siteName, tagline, logo, footerText, social } = await getSettings();
  // Safe here: getSettings has already deferred this component to request time.
  const currentYear = new Date().getFullYear();
  return (
    <footer className="border-t border-line/40 bg-background/80">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 py-9 text-sm md:flex-row lg:px-8">
        <BrandLogo siteName={siteName} tagline={tagline} logo={logo} />
        <p className="text-center text-muted">
          © {currentYear} {siteName}. {footerText}
        </p>
        <nav aria-label="Legal" className="flex items-center gap-3 text-muted">
          <Link href="/privacy" className="hover:text-cyan">
            Privacy Policy
          </Link>
          <span aria-hidden>|</span>
          <Link href="/terms" className="hover:text-cyan">
            Terms of Service
          </Link>
        </nav>
        <SocialLinkList social={social} />
      </div>
    </footer>
  );
}
