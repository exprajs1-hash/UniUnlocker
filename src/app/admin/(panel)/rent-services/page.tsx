import type { Metadata } from "next";
import { RentServicesManager } from "@/components/admin/rent-services-manager";

export const metadata: Metadata = { title: "Rent services" };

export default function Page() {
  return <RentServicesManager />;
}
