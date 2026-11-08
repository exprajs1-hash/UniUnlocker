import {
  Bug,
  Code2,
  Cog,
  Cpu,
  Database,
  Globe,
  Headphones,
  KeyRound,
  Lock,
  Puzzle,
  Rocket,
  Server,
  Settings2,
  ShieldCheck,
  Smartphone,
  Terminal,
  Usb,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** The icons admins can choose for a service. Names are what MongoDB stores. */
export const SERVICE_ICONS = {
  Wrench,
  Cog,
  Lock,
  Server,
  Puzzle,
  Smartphone,
  Code2,
  Cpu,
  Bug,
  Database,
  Globe,
  Headphones,
  KeyRound,
  Rocket,
  Settings2,
  ShieldCheck,
  Terminal,
  Usb,
  Zap,
} as const satisfies Record<string, LucideIcon>;

export type ServiceIconName = keyof typeof SERVICE_ICONS;

export const SERVICE_ICON_NAMES = Object.keys(SERVICE_ICONS) as [
  ServiceIconName,
  ...ServiceIconName[],
];

export function getServiceIcon(name: string): LucideIcon {
  return SERVICE_ICONS[name as ServiceIconName] ?? Wrench;
}
