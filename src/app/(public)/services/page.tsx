import type { Metadata } from "next";
import { RentCatalog } from "@/components/rent/rent-catalog";
import { SectionHeading } from "@/components/sections/section-heading";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Tool rent, IMEI and server services for mobile unlock and repair. Pay from your UniUnlocker balance and get your result instantly.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <SectionHeading lead="Our" highlight="Services" subtitle="Tool rent, IMEI and server services, paid from your balance" />
      <div className="mt-10">
        <RentCatalog />
      </div>
    </div>
  );
}
