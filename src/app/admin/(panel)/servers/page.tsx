import type { Metadata } from "next";
import { ServersManager } from "@/components/admin/servers-manager";

export const metadata: Metadata = { title: "Servers" };

export default function ServersPage() {
  return <ServersManager />;
}
