import { SafeImage } from "@/components/ui/safe-image";

/** The uploaded logo when there is one, otherwise the neon "T" mark. */
export function BrandLogo({
  siteName,
  tagline,
  logo,
}: {
  siteName: string;
  tagline: string;
  logo: string;
}) {
  return (
    <span className="flex items-center gap-2.5">
      {logo ? (
        <SafeImage src={logo} alt="" width={44} height={44} className="size-11 rounded-lg object-contain" />
      ) : (
        <svg aria-hidden viewBox="0 0 48 48" className="size-11 drop-shadow-[0_0_8px_rgb(0_229_255/0.7)]">
          <defs>
            <linearGradient id="brand-mark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#00e5ff" />
              <stop offset="1" stopColor="#087bff" />
            </linearGradient>
          </defs>
          <path d="M7 5h11v22a6 6 0 0 0 12 0V5h11v22a17 17 0 0 1-34 0z" fill="url(#brand-mark)" />
        </svg>
      )}
      <span className="flex flex-col leading-tight">
        <span className="font-display text-xl font-bold">{siteName}</span>
        {tagline && <span className="text-xs text-muted">{tagline}</span>}
      </span>
    </span>
  );
}
