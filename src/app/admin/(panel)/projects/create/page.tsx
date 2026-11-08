import type { Metadata } from "next";
import { ProjectForm } from "@/components/admin/project-form";

export const metadata: Metadata = { title: "Add project" };

export default function CreateProjectPage() {
  return <ProjectForm />;
}
