import { Link } from "react-router-dom";
import { Star, Zap } from "lucide-react";
import { fromPrice, type Product } from "../data/catalog";
import { useCatalog } from "../lib/catalog";
import { useT } from "../lib/i18n";
import { rm } from "../lib/format";

export default function ProductCard({ p }: { p: Product }) {
  const { getCategory } = useCatalog();
  const { t } = useT();
  return (
    <Link to={`/products/${p.slug}`} className="card lift group flex flex-col p-4 hover:border-brand/40">
      {p.images[0] ? <img src={p.images[0]} alt={p.name} loading="lazy" decoding="async" className="mb-4 h-28 w-full rounded-xl bg-soft object-contain" />
        : <div className="mb-4 grid h-28 place-items-center rounded-xl bg-soft text-3xl font-bold text-brand" aria-hidden>{p.name[0]}</div>}
      <p className="text-xs text-mute">{getCategory(p.category)?.name}</p>
      <h3 className="mt-0.5 font-semibold">{p.name}</h3>
      <p className="mt-1 text-sm text-mute">{p.blurb}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {p.delivery === "instant" && <span className="inline-flex items-center gap-1 rounded-full bg-ok/10 px-2 py-0.5 font-medium text-ok"><Zap className="h-3 w-3" aria-hidden />{t("instant")}</span>}
        <span className={p.available ? "text-mute" : "font-medium text-brand"}>{p.available ? t("available") : t("out")}</span>
        {p.rating && <span className="inline-flex items-center gap-0.5 text-mute"><Star className="h-3 w-3 fill-current" aria-hidden />{p.rating.avg} ({p.rating.count})</span>}
      </div>
      <div className="mt-auto flex items-center justify-between pt-4">
        <span className="font-semibold">{p.variants.length > 1 ? `${t("from")} ` : ""}{rm(fromPrice(p))}</span>
        <span className="btn btn-primary !px-4 !py-2">{t("buyNow")}</span>
      </div>
    </Link>
  );
}
