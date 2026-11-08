import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { fromPrice, getCategory, type Product } from "../data/catalog";
import { rm } from "../lib/format";
export default function ProductCard({ p }: { p: Product }) {
  return (
    <Link to={`/products/${p.slug}`} className="card group flex flex-col p-4 transition hover:border-brand/40 hover:shadow-sm">
      <div className="mb-4 grid h-28 place-items-center rounded-xl bg-soft text-3xl font-bold text-brand">{p.name[0]}</div>
      <p className="text-xs text-mute">{getCategory(p.category)?.name}</p>
      <h3 className="mt-0.5 font-semibold">{p.name}</h3>
      <p className="mt-1 text-sm text-mute">{p.blurb}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {p.delivery === "instant" && <span className="inline-flex items-center gap-1 rounded-full bg-ok/10 px-2 py-0.5 font-medium text-ok"><Zap className="h-3 w-3" aria-hidden />Instant delivery</span>}
        <span className={p.available ? "text-mute" : "font-medium text-brand"}>{p.available ? "Available" : "Out of stock"}</span>
      </div>
      <div className="mt-auto flex items-center justify-between pt-4">
        <span className="font-semibold">{p.variants.length > 1 ? "From " : ""}{rm(fromPrice(p))}</span>
        <span className="btn btn-primary !px-4 !py-2">Buy now</span>
      </div>
    </Link>
  );
}
