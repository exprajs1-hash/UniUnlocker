import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { listingHref, pageWindow } from "@/lib/pagination";

const ITEM = "flex size-10 items-center justify-center rounded-full border text-sm font-semibold transition";
const IDLE = `${ITEM} border-line hover:border-cyan hover:text-cyan`;
const DISABLED = `${ITEM} border-line/40 text-muted/40`;
const CURRENT = `${ITEM} border-transparent bg-linear-to-r from-primary to-[#00b4ff] text-white shadow-[0_0_14px_rgb(8_123_255/0.6)]`;

/** Link-based, so every page has its own URL and works without JavaScript. */
export function Pagination({
  page,
  totalPages,
  basePath,
  params = {},
}: {
  page: number;
  totalPages: number;
  basePath: string;
  /** Other query values (such as a filter) to keep when changing page. */
  params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;
  const href = (target: number) => listingHref(basePath, params, target);

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} aria-label="Previous page" className={IDLE}>
          <ChevronLeft aria-hidden className="size-4" />
        </Link>
      ) : (
        <span aria-hidden className={DISABLED}>
          <ChevronLeft className="size-4" />
        </span>
      )}

      {pageWindow(page, totalPages).map((number, index) =>
        number === null ? (
          <span key={`gap-${index}`} aria-hidden className="px-1 text-muted">
            …
          </span>
        ) : (
          <Link
            key={number}
            href={href(number)}
            aria-label={`Page ${number}`}
            aria-current={number === page ? "page" : undefined}
            className={number === page ? CURRENT : IDLE}
          >
            {number}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={href(page + 1)} aria-label="Next page" className={IDLE}>
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      ) : (
        <span aria-hidden className={DISABLED}>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
