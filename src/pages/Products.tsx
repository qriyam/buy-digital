import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { fromPrice } from "../data/catalog";
import { useCatalog } from "../lib/catalog";
import { useT } from "../lib/i18n";
import ProductCard from "../components/ProductCard";
import ProductSkeleton from "../components/ProductSkeleton";
import Seo from "../lib/seo";

const PAGE = 12;
export default function Products() {
  const { slug } = useParams();
  const { categories, products, getCategory, loading, error, reload } = useCatalog();
  const { t } = useT();
  const [sp, setSp] = useSearchParams();
  const [shown, setShown] = useState(PAGE);
  const q = sp.get("q") ?? "", sort = sp.get("sort") ?? "popular", cat = slug ?? sp.get("category") ?? "", avail = sp.get("available") === "1";
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n, { replace: true }); setShown(PAGE); };
  const list = useMemo(() => {
    const s = q.toLowerCase();
    const out = products.filter((p) => (!cat || p.category === cat) && (!avail || p.available) && (!s || [p.name, p.description, getCategory(p.category)?.name ?? ""].some((x) => x.toLowerCase().includes(s))));
    if (sort === "low") out.sort((a, b) => fromPrice(a) - fromPrice(b));
    else if (sort === "high") out.sort((a, b) => fromPrice(b) - fromPrice(a));
    else if (sort === "new") out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else out.sort((a, b) => Number(b.popular) - Number(a.popular) || Number(b.featured) - Number(a.featured));
    return out;
  }, [q, sort, cat, avail, products, getCategory]);
  const sel = "rounded-xl border border-line bg-white px-3 py-2 text-sm";
  const heading = slug ? getCategory(slug)?.name ?? t("products") : t("products");
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Seo title={heading} path={slug ? `/categories/${slug}` : "/products"} description={`Browse ${heading} on BuyDigital. Prices in RM, secure payment, digital delivery.`} />
      <h1 className="text-3xl font-bold tracking-tight">{heading}</h1>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => set("q", e.target.value)} placeholder={t("search")} aria-label={t("search")} className={`${sel} w-full sm:w-64`} />
        {!slug && <select value={cat} onChange={(e) => set("category", e.target.value)} className={sel} aria-label={t("category")}><option value="">{t("allCategories")}</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>}
        <select value={sort} onChange={(e) => set("sort", e.target.value)} className={sel} aria-label="Sort"><option value="popular">{t("sortPopular")}</option><option value="low">{t("sortLow")}</option><option value="high">{t("sortHigh")}</option><option value="new">{t("sortNew")}</option></select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={avail} onChange={(e) => set("available", e.target.checked ? "1" : "")} />{t("inStockOnly")}</label>
      </div>
      {loading ? <ProductSkeleton n={8} /> : error ? <div className="card mt-16 flex flex-wrap items-center justify-center gap-3 p-6 text-sm" role="alert"><span>We couldn’t load the catalogue right now.</span><button className="btn btn-ghost !py-2" onClick={reload}>Retry</button></div> : list.length === 0 ? <p className="mt-16 text-center text-mute">{products.length ? t("noMatch") : t("storeSetup")}</p> : (<>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{list.slice(0, shown).map((p) => <ProductCard key={p.slug} p={p} />)}</div>
        {shown < list.length && <div className="mt-8 text-center"><button className="btn btn-ghost" onClick={() => setShown(shown + PAGE)}>{t("loadMore")}</button></div>}</>)}
    </div>
  );
}
