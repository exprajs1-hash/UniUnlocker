import { ArrowRight } from "lucide-react";
import Link from "next/link";

const STYLES = {
  /** Compact pill for tight spots such as a card header. */
  small:
    "inline-flex items-center gap-1 rounded-full border border-cyan/50 px-3 py-1.5 text-xs font-semibold text-cyan transition hover:bg-cyan/10 hover:shadow-[0_0_12px_rgb(0_229_255/0.4)]",
  regular: "btn-outline min-h-11! px-6! text-sm",
} as const;

export function ViewAllLink({ href, size = "regular" }: { href: string; size?: keyof typeof STYLES }) {
  return (
    <Link href={href} className={STYLES[size]}>
      View All <ArrowRight aria-hidden className={size === "small" ? "size-3.5" : "size-4"} />
    </Link>
  );
}

/** Centered "View All" under a homepage section, with how many of the total are shown. */
export function ViewAllFooter({ href, shown, total }: { href: string; shown: number; total: number }) {
  if (total === 0) return null;
  return (
    <div className="mt-8 flex flex-col items-center gap-2">
      <ViewAllLink href={href} />
      {total > shown && (
        <p className="text-xs text-muted">
          Showing {shown} of {total}
        </p>
      )}
    </div>
  );
}
