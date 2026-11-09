import { AppWindow, BookOpen, Briefcase, Cloud, Code, Film, Gamepad2, Gift, GraduationCap, Headphones, ListChecks, Music, Package, ShieldCheck, Smartphone, Sparkles, Tv, Wifi, type LucideIcon } from "lucide-react";
export const iconNames = ["Tv", "GraduationCap", "Sparkles", "AppWindow", "Gift", "Gamepad2", "ListChecks", "Package", "Music", "Film", "BookOpen", "Briefcase", "Cloud", "Code", "Headphones", "ShieldCheck", "Smartphone", "Wifi"];
const map: Record<string, LucideIcon> = { AppWindow, BookOpen, Briefcase, Cloud, Code, Film, Gamepad2, Gift, GraduationCap, Headphones, ListChecks, Music, Package, ShieldCheck, Smartphone, Sparkles, Tv, Wifi };
export function Icon({ name, className }: { name: string; className?: string }) {
  const I = map[name] ?? Package;
  return <I className={className} aria-hidden />;
}
