"use client";

import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AdminEmpty, ListSkeleton, LoadError, PageHeader, Toggle } from "@/components/admin/form";
import { ConfirmDialog } from "@/components/ui/modal";
import { SafeImage } from "@/components/ui/safe-image";
import { useToast } from "@/components/ui/toast";
import { useResource } from "@/hooks/use-resource";
import { apiFetch, errorMessage, moved } from "@/lib/client-api";
import type { ProjectDTO } from "@/types";

export function ProjectsManager() {
  const { data, error, loading, reload, setData } = useResource<{ projects: ProjectDTO[] }>("/api/projects?all=1");
  const [query, setQuery] = useState("");
  const [deleting, setDeleting] = useState<ProjectDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const projects = data?.projects ?? [];

  const term = query.trim().toLowerCase();
  const visible = term
    ? projects.filter((p) => p.title.toLowerCase().includes(term) || p.category.toLowerCase().includes(term))
    : projects;

  const applyLocal = (id: string, changes: Partial<ProjectDTO>) =>
    setData((current) =>
      current && { projects: current.projects.map((p) => (p.id === id ? { ...p, ...changes } : p)) },
    );

  async function patch(project: ProjectDTO, changes: Pick<Partial<ProjectDTO>, "featured" | "status">, message: string) {
    applyLocal(project.id, changes);
    try {
      await apiFetch(`/api/projects/${project.id}`, { method: "PATCH", body: changes });
      toast.success(message);
    } catch (patchError) {
      applyLocal(project.id, project);
      toast.error(errorMessage(patchError));
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = moved(projects, index, direction);
    if (!next) return;
    setData(() => ({ projects: next }));
    try {
      await apiFetch("/api/projects/reorder", { method: "POST", body: { ids: next.map((p) => p.id) } });
    } catch (moveError) {
      toast.error(errorMessage(moveError));
      reload();
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiFetch(`/api/projects/${deleting.id}`, { method: "DELETE" });
      toast.success("Project deleted.");
      setDeleting(null);
      reload();
    } catch (deleteError) {
      toast.error(errorMessage(deleteError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description="Published projects appear on the public portfolio. Drafts stay hidden."
        action={
          <Link href="/admin/projects/create" className="admin-btn admin-btn-primary">
            <Plus aria-hidden className="size-4" /> Add project
          </Link>
        }
      />

      {projects.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search aria-hidden className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-admin-muted" />
          <input
            aria-label="Search projects"
            placeholder="Search by title or category"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="admin-input pl-9!"
          />
        </div>
      )}

      {loading ? (
        <ListSkeleton />
      ) : error && !data ? (
        <LoadError message={error} onRetry={reload} />
      ) : projects.length === 0 ? (
        <AdminEmpty
          title="No projects yet"
          message="Add your first project to build out the portfolio."
          action={
            <Link href="/admin/projects/create" className="admin-btn admin-btn-primary">
              Add project
            </Link>
          }
        />
      ) : visible.length === 0 ? (
        <AdminEmpty title="No matches" message="No project matches that search." />
      ) : (
        <ul className="space-y-3">
          {visible.map((project) => {
            // Positions come from the full list, so arrows stay correct while searching.
            const index = projects.findIndex((p) => p.id === project.id);
            const published = project.status === "published";
            return (
              <li key={project.id} className="admin-card flex flex-col gap-4 p-3 md:flex-row md:items-center">
                <div className="relative aspect-[3/2] w-full shrink-0 overflow-hidden rounded-md md:w-28">
                  <SafeImage src={project.image} alt="" fill sizes="112px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium">{project.title}</h2>
                    <span className={`rounded px-1.5 py-0.5 text-xs ${published ? "bg-status-online/15 text-status-online" : "bg-admin-raised text-admin-muted"}`}>
                      {published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="truncate text-sm text-admin-muted">
                    {project.category} · /portfolio/{project.slug}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Toggle
                    label="Published"
                    checked={published}
                    onChange={(value) =>
                      void patch(project, { status: value ? "published" : "draft" }, value ? `${project.title} published.` : `${project.title} moved to drafts.`)
                    }
                  />
                  <Toggle
                    label="Featured"
                    checked={project.featured}
                    onChange={(value) =>
                      void patch(project, { featured: value }, value ? `${project.title} featured.` : `${project.title} no longer featured.`)
                    }
                  />
                  <div className="flex items-center">
                    <button type="button" aria-label={`Move ${project.title} up`} disabled={index === 0} onClick={() => void move(index, -1)} className="admin-icon-btn">
                      <ArrowUp aria-hidden className="size-4" />
                    </button>
                    <button type="button" aria-label={`Move ${project.title} down`} disabled={index === projects.length - 1} onClick={() => void move(index, 1)} className="admin-icon-btn">
                      <ArrowDown aria-hidden className="size-4" />
                    </button>
                    {published && (
                      <a href={`/portfolio/${project.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`View ${project.title} on the website`} className="admin-icon-btn">
                        <ExternalLink aria-hidden className="size-4" />
                      </a>
                    )}
                    <Link href={`/admin/projects/${project.id}/edit`} aria-label={`Edit ${project.title}`} className="admin-icon-btn">
                      <Pencil aria-hidden className="size-4" />
                    </Link>
                    <button type="button" aria-label={`Delete ${project.title}`} onClick={() => setDeleting(project)} className="admin-icon-btn hover:text-status-offline!">
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete project?"
        message={`"${deleting?.title}" will be permanently removed. This cannot be undone.`}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
