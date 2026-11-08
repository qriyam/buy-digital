import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { fromPrice } from "../data/catalog";
import { useCatalog } from "../lib/catalog";
import ProductCard from "../components/ProductCard";

export default function Products() {
  const { categories, products, getCategory, loading } = useCatalog();
  const { slug } = useParams();
  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") ?? "", sort = sp.get("sort") ?? "popular", cat = slug ?? sp.get("category") ?? "", avail = sp.get("available") === "1";
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n, { replace: true }); };
  const list = useMemo(() => {
    const s = q.toLowerCase();
    const out = products.filter((p) => (!cat || p.category === cat) && (!avail || p.available) &&
      (!s || [p.name, p.description, getCategory(p.category)?.name ?? ""].some((t) => t.toLowerCase().includes(s))));
    if (sort === "low") out.sort((a, b) => fromPrice(a) - fromPrice(b));
    if (sort === "high") out.sort((a, b) => fromPrice(b) - fromPrice(a));
    return out;
  }, [q, sort, cat, avail, products, getCategory]);
  const sel = "rounded-xl border border-line bg-white px-3 py-2 text-sm";
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{slug ? getCategory(slug)?.name ?? "Category not found" : "Products"}</h1>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => set("q", e.target.value)} placeholder="Search products" aria-label="Search products" className={`${sel} w-full sm:w-64`} />
        {!slug && <select value={cat} onChange={(e) => set("category", e.target.value)} className={sel} aria-label="Category"><option value="">All categories</option>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>}
        <select value={sort} onChange={(e) => set("sort", e.target.value)} className={sel} aria-label="Sort"><option value="popular">Popular</option><option value="low">Price: Low to High</option><option value="high">Price: High to Low</option></select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={avail} onChange={(e) => set("available", e.target.checked ? "1" : "")} />In stock only</label>
      </div>
      {loading ? <p className="mt-16 text-center text-mute">Loading…</p> : list.length === 0 ? <p className="mt-16 text-center text-mute">No products match your search.</p> :
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{list.map((p) => <ProductCard key={p.slug} p={p} />)}</div>}
    </div>
  );
}
