import type { Metadata } from "next";
import { PartnersManager } from "@/components/admin/partners-manager";

export const metadata: Metadata = { title: "Partners" };

export default function PartnersPage() {
  return <PartnersManager />;
}
