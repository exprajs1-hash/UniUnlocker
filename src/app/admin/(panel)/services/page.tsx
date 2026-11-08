import type { Metadata } from "next";
import { ServicesManager } from "@/components/admin/services-manager";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return <ServicesManager />;
}
