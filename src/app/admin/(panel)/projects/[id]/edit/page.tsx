import { Types } from "mongoose";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/admin/form";
import { ProjectForm } from "@/components/admin/project-form";
import { requireAdminPage } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { serialize } from "@/lib/serialize";
import { Project } from "@/models/Project";
import type { ProjectDTO } from "@/types";

export const metadata: Metadata = { title: "Edit project" };

type Props = PageProps<"/admin/projects/[id]/edit">;

async function Editor({ params }: Pick<Props, "params">) {
  await requireAdminPage();
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) notFound();

  await connectToDatabase();
  const project = await Project.findById(id).lean();
  if (!project) notFound();
  const data = serialize<ProjectDTO>(project);
  // Keyed so a preserved form cannot overwrite changes saved elsewhere, such as listing toggles.
  return <ProjectForm key={data.updatedAt} project={data} />;
}

export default function EditProjectPage({ params }: Props) {
  return (
    <Suspense fallback={<ListSkeleton rows={3} />}>
      <Editor params={params} />
    </Suspense>
  );
}
