import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Pagination } from "@/components/listing/pagination";
import { SectionHeading } from "@/components/sections/section-heading";
import { GridSkeleton } from "@/components/ui/skeleton";
import type { Paged } from "@/lib/pagination";

/** Shell shared by every "View All" page: back link, heading, optional toolbar, streamed content. */
export function ListingPage({
  backHref,
  lead,
  highlight,
  subtitle,
  toolbar,
  skeletonColumns,
  children,
}: {
  backHref: string;
  lead: string;
  highlight: string;
  subtitle: string;
  toolbar?: ReactNode;
  /** Grid columns of the loading placeholder, matching the real grid. */
  skeletonColumns: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <Link href={backHref} className="mb-6 inline-flex items-center gap-2 text-sm text-muted hover:text-cyan">
        <ArrowLeft aria-hidden className="size-4" /> Back to home
      </Link>
      <SectionHeading lead={lead} highlight={highlight} subtitle={subtitle} />
      {toolbar && <div className="mt-6 flex justify-center">{toolbar}</div>}
      <div className="mt-8">
        <Suspense fallback={<GridSkeleton count={8} columns={skeletonColumns} />}>{children}</Suspense>
      </div>
    </div>
  );
}

/** "Showing X–Y of Z", the page's items, then the page links. */
export function PagedResults({
  paged,
  basePath,
  params,
  children,
}: {
  paged: Paged<unknown>;
  basePath: string;
  params?: Record<string, string | undefined>;
  children: ReactNode;
}) {
  return (
    <>
      <p className="mb-5 text-center text-sm text-muted">
        Showing {paged.start + 1}–{paged.start + paged.items.length} of {paged.total}
      </p>
      {children}
      <Pagination page={paged.page} totalPages={paged.totalPages} basePath={basePath} params={params} />
    </>
  );
}
