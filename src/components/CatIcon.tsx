import { Icon } from "../lib/icons";
import type { Category } from "../data/catalog";
// A category's uploaded picture when it has one, otherwise its chosen icon.
export default function CatIcon({ c, size = "h-10 w-10" }: { c: Category; size?: string }) {
  return c.image
    ? <img src={c.image} alt="" loading="lazy" className={`${size} rounded-xl bg-soft object-cover`} />
    : <span className={`grid ${size} place-items-center rounded-xl bg-brand/10 text-brand`}><Icon name={c.icon} className="h-5 w-5" /></span>;
}
