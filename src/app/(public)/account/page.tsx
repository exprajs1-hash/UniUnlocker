import type { Metadata } from "next";
import { AccountDashboard } from "@/components/rent/account-dashboard";
import { getSettings } from "@/lib/data";
import { telegramLink, whatsappLink } from "@/utils/format";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const settings = await getSettings();
  const contactUrl = settings.whatsappNumber.replace(/\D/g, "")
    ? whatsappLink(settings.whatsappNumber, `Hi ${settings.siteName}, I'd like to add balance to my account.`)
    : settings.telegramUsername
      ? telegramLink(settings.telegramUsername)
      : null;

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 lg:px-8">
      <AccountDashboard contactUrl={contactUrl} />
    </div>
  );
}
