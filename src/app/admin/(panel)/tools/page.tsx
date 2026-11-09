import type { Metadata } from "next";
import { ToolsManager } from "@/components/admin/tools-manager";

export const metadata: Metadata = { title: "Tools" };

export default function ToolsPage() {
  return <ToolsManager />;
}
