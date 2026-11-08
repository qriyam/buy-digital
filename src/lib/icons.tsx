import { AppWindow, Gamepad2, Gift, GraduationCap, ListChecks, Package, Sparkles, Tv, type LucideIcon } from "lucide-react";
const map: Record<string, LucideIcon> = { AppWindow, Gamepad2, Gift, GraduationCap, ListChecks, Package, Sparkles, Tv };
export function Icon({ name, className }: { name: string; className?: string }) {
  const I = map[name] ?? Package;
  return <I className={className} aria-hidden />;
}
