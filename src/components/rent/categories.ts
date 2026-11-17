import { createElement } from "react";
import {
  Cloud,
  Cpu,
  Globe,
  KeyRound,
  LockOpen,
  Monitor,
  Server,
  ShieldCheck,
  Smartphone,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { CategoryIconName } from "@/types";

/** The icons an admin can pick for a category. */
export const CATEGORY_ICONS: Record<CategoryIconName, LucideIcon> = {
  key: KeyRound,
  smartphone: Smartphone,
  server: Server,
  globe: Globe,
  monitor: Monitor,
  wifi: Wifi,
  cpu: Cpu,
  unlock: LockOpen,
  shield: ShieldCheck,
  wrench: Wrench,
  zap: Zap,
  cloud: Cloud,
};

export function categoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name as CategoryIconName] ?? Globe;
}

/** Every category has its own page: /services/rent, /services/imei, /services/<custom-slug>. */
export function categoryHref(slug: string): string {
  return `/services/${slug}`;
}

/** Renders a category's icon by name. */
export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  return createElement(categoryIcon(name), { "aria-hidden": true, className });
}
