import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  message,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
}) {
  return (
    <div className="neon-card mx-auto flex max-w-lg flex-col items-center gap-2 px-6 py-10 text-center">
      <Icon aria-hidden className="size-9 text-cyan" />
      <h3 className="mt-1 font-display text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
