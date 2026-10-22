import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Car,
  GraduationCap,
  Headset,
  Scale,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Mapa de ícones usado pelas configurações em config/site.ts */
export const iconMap: Record<string, LucideIcon> = {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  Car,
  GraduationCap,
  Headset,
  Scale,
  ShieldCheck,
  Users,
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name] ?? ShieldCheck;
}