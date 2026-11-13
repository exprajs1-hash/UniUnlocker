import type { Metadata } from "next";
import { RentCatalog } from "@/components/rent/rent-catalog";
import { SectionHeading } from "@/components/sections/section-heading";

export const metadata: Metadata = {
  title: "Tools Rent",
  description: "Rent mobile unlock and repair tools by the hour. Pay from your UniUnlocker balance and get your login instantly.",
  alternates: { canonical: "/rent" },
};

export default function RentPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <SectionHeading lead="Tools" highlight="Rent" subtitle="Rent premium unlock tools by the hour, paid from your balance" />
      <div className="mt-10">
        <RentCatalog />
      </div>
    </div>
  );
}
