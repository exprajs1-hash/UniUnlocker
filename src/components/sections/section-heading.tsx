/** "My <highlight>" heading with the neon lines either side, as in the reference design. */
export function SectionHeading({
  lead,
  highlight,
  subtitle,
}: {
  lead?: string;
  highlight: string;
  subtitle?: string;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-3 sm:gap-6">
        <span aria-hidden className="h-0.5 w-8 shrink bg-linear-to-r from-transparent to-cyan sm:w-28" />
        <h2 className="font-display text-[1.7rem] font-bold whitespace-nowrap sm:text-4xl">
          {lead && `${lead} `}
          <span className="text-neon">{highlight}</span>
        </h2>
        <span aria-hidden className="h-0.5 w-8 shrink bg-linear-to-l from-transparent to-cyan sm:w-28" />
      </div>
      {subtitle && <p className="mt-3 text-muted">{subtitle}</p>}
    </div>
  );
}
