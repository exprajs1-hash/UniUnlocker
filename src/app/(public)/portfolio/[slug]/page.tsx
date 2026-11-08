import { ArrowLeft, ExternalLink, Star, Tag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublishedProjectBySlug } from "@/lib/data";
import { isUsableImageUrl } from "@/lib/images";

type Props = PageProps<"/portfolio/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(slug);
  if (!project) return { title: "Project not found", robots: { index: false } };
  return {
    title: project.title,
    description: project.shortDescription,
    alternates: { canonical: `/portfolio/${project.slug}` },
    openGraph: {
      type: "article",
      title: project.title,
      description: project.shortDescription,
      images: isUsableImageUrl(project.image) ? [project.image] : undefined,
    },
  };
}

async function ProjectDetails({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const project = await getPublishedProjectBySlug(slug);
  if (!project) notFound();

  return (
    <article>
      <h1 className="font-display text-3xl font-bold sm:text-5xl">{project.title}</h1>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-cyan">
          <Tag aria-hidden className="size-3.5" /> {project.category}
        </span>
        {project.featured && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple/60 px-3 py-1 text-foreground">
            <Star aria-hidden className="size-3.5" /> Featured
          </span>
        )}
      </div>

      <div className="neon-card relative mt-8 aspect-[16/9] overflow-hidden">
        <SafeImage
          src={project.image}
          alt={project.title}
          fill
          priority
          sizes="(min-width: 1024px) 896px, 100vw"
          className="object-cover"
        />
      </div>

      <p className="mt-8 text-lg text-foreground/90">{project.shortDescription}</p>
      {project.description && (
        <div className="mt-4 leading-relaxed whitespace-pre-line text-muted">{project.description}</div>
      )}

      {project.projectUrl && (
        <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" className="btn-neon mt-8">
          Visit project <ExternalLink aria-hidden className="size-4" />
        </a>
      )}
    </article>
  );
}

export default function ProjectPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12 lg:px-8">
      <Link href="/portfolio" className="mb-8 inline-flex items-center gap-2 text-sm text-muted hover:text-cyan">
        <ArrowLeft aria-hidden className="size-4" /> Back to all projects
      </Link>
      <Suspense
        fallback={
          <div role="status" aria-label="Loading project">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="mt-4 h-7 w-40 rounded-full" />
            <Skeleton className="mt-8 aspect-[16/9] rounded-2xl" />
            <Skeleton className="mt-8 h-6 w-full" />
          </div>
        }
      >
        <ProjectDetails params={params} />
      </Suspense>
    </div>
  );
}
