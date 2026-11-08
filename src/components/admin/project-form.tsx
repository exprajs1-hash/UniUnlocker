"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PageHeader, SelectField, TextAreaField, TextField, Toggle } from "@/components/admin/form";
import { ImageField } from "@/components/admin/image-field";
import { useToast } from "@/components/ui/toast";
import { apiFetch, clearFieldError, errorMessage, fieldErrorsOf } from "@/lib/client-api";
import type { ProjectDTO, ProjectStatus } from "@/types";
import { slugify } from "@/utils/slug";

type Draft = Pick<
  ProjectDTO,
  "title" | "slug" | "shortDescription" | "description" | "category" | "image" | "projectUrl" | "featured" | "status" | "displayOrder"
>;

const EMPTY: Draft = {
  title: "",
  slug: "",
  shortDescription: "",
  description: "",
  category: "",
  image: "",
  projectUrl: "",
  featured: false,
  status: "draft",
  displayOrder: 0,
};

const STATUS_OPTIONS: ReadonlyArray<{ value: ProjectStatus; label: string }> = [
  { value: "draft", label: "Draft (hidden from the website)" },
  { value: "published", label: "Published (visible on the website)" },
];

export function ProjectForm({ project }: { project?: ProjectDTO }) {
  const [draft, setDraft] = useState<Draft>(project ?? EMPTY);
  // New projects follow the title until the slug is edited by hand; existing URLs stay put.
  const [slugTouched, setSlugTouched] = useState(Boolean(project));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => clearFieldError(current, key));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await apiFetch(project ? `/api/projects/${project.id}` : "/api/projects", {
        method: project ? "PUT" : "POST",
        body: draft,
      });
      toast.success(project ? "Project saved." : "Project created.");
      // Next keeps this page's state after navigating, so "Add project" must start clean next time.
      if (!project) {
        setDraft(EMPTY);
        setSlugTouched(false);
      }
      router.push("/admin/projects");
    } catch (error) {
      setErrors(fieldErrorsOf(error));
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link href="/admin/projects" className="mb-4 inline-flex items-center gap-2 text-sm text-admin-muted hover:text-admin-text">
        <ArrowLeft aria-hidden className="size-4" /> All projects
      </Link>
      <PageHeader title={project ? "Edit project" : "Add project"} />

      <form onSubmit={submit} noValidate className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="admin-card space-y-4 p-5">
          <TextField
            label="Title"
            value={draft.title}
            required
            error={errors.title}
            onChange={(title) => {
              set("title", title);
              if (!slugTouched) set("slug", slugify(title));
            }}
          />
          <TextField
            label="Slug"
            value={draft.slug}
            error={errors.slug}
            hint={`Page address: /portfolio/${draft.slug || "your-project"}`}
            onChange={(slug) => {
              setSlugTouched(true);
              set("slug", slug);
            }}
          />
          <TextAreaField
            label="Short description"
            rows={2}
            value={draft.shortDescription}
            error={errors.shortDescription}
            hint="Shown on the project card."
            onChange={(value) => set("shortDescription", value)}
          />
          <TextAreaField
            label="Full description"
            rows={8}
            value={draft.description}
            error={errors.description}
            hint="Shown on the project details page."
            onChange={(value) => set("description", value)}
          />
          <ImageField label="Project image" value={draft.image} error={errors.image} onChange={(value) => set("image", value)} />
        </div>

        <div className="space-y-5">
          <div className="admin-card space-y-4 p-5">
            <SelectField label="Status" value={draft.status} options={STATUS_OPTIONS} error={errors.status} onChange={(value) => set("status", value)} />
            <Toggle label="Featured project" checked={draft.featured} onChange={(value) => set("featured", value)} />
            <TextField label="Category" value={draft.category} required error={errors.category} placeholder="e.g. Software" onChange={(value) => set("category", value)} />
            <TextField
              label="Display order"
              type="number"
              value={String(draft.displayOrder)}
              error={errors.displayOrder}
              hint="Lower numbers appear first."
              onChange={(value) => set("displayOrder", Number(value))}
            />
            <TextField label="Project URL (optional)" type="url" value={draft.projectUrl} error={errors.projectUrl} placeholder="https://" onChange={(value) => set("projectUrl", value)} />
          </div>
          <button type="submit" disabled={busy} className="admin-btn admin-btn-primary w-full">
            {busy ? "Saving…" : project ? "Save changes" : "Create project"}
          </button>
        </div>
      </form>
    </>
  );
}
