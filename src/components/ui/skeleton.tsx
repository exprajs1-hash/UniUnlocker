export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

export function HeroSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto min-h-[36rem] max-w-7xl px-5 py-20 lg:px-8">
      <Skeleton className="h-4 w-52" />
      <Skeleton className="mt-6 h-14 w-full max-w-xl" />
      <Skeleton className="mt-3 h-14 w-full max-w-lg" />
      <Skeleton className="mt-7 h-6 w-64" />
      <Skeleton className="mt-4 h-5 w-full max-w-md" />
      <div className="mt-8 flex gap-4">
        <Skeleton className="h-12 w-40 rounded-full" />
        <Skeleton className="h-12 w-40 rounded-full" />
      </div>
    </div>
  );
}

/** Just the grid of placeholder cards, for use inside a page that already has its heading. */
export function GridSkeleton({
  count = 4,
  height = "h-44",
  columns = "sm:grid-cols-2 lg:grid-cols-4",
}: {
  count?: number;
  height?: string;
  columns?: string;
}) {
  return (
    <div role="status" aria-label="Loading" className={`grid gap-5 ${columns}`}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={`${height} rounded-2xl`} />
      ))}
    </div>
  );
}

export function CardGridSkeleton({
  count = 4,
  height = "h-44",
  columns = "sm:grid-cols-2 lg:grid-cols-4",
}: {
  count?: number;
  height?: string;
  columns?: string;
}) {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
      <Skeleton className="mx-auto h-9 w-56" />
      <Skeleton className="mx-auto mt-3 h-5 w-72 max-w-full" />
      <div className="mt-10">
        <GridSkeleton count={count} height={height} columns={columns} />
      </div>
    </div>
  );
}

export function SplitSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-2 lg:px-8">
      <Skeleton className="aspect-[3/2] rounded-2xl" />
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
      </div>
    </div>
  );
}

export function NavbarSkeleton() {
  return (
    <div className="sticky top-0 z-40 h-[4.5rem] border-b border-line/30 bg-background/70">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-5 lg:px-8">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
    </div>
  );
}

export function FooterSkeleton() {
  return (
    <div className="border-t border-line/30">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-10 lg:px-8">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-6 w-56" />
      </div>
    </div>
  );
}
