import type { Metadata } from "next";
import { AboutForm } from "@/components/admin/about-form";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return <AboutForm />;
}
