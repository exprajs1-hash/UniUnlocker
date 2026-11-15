import type { Metadata } from "next";
import { RentCatalog } from "@/components/rent/rent-catalog";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Tool rent, IMEI and server services for mobile unlock and repair. Pay from your UniUnlocker balance and get your result instantly.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      {/* The catalog renders the page header (h1), since its title and counts follow the selected tab. */}
      <RentCatalog />
    </div>
  );
}
