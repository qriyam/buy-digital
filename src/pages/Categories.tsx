import { Link } from "react-router-dom";
import { useCatalog } from "../lib/catalog";
import { Icon } from "../lib/icons";
export default function Categories() {
  const { categories, products } = useCatalog();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((c) => { const n = products.filter((p) => p.category === c.slug).length; return (
          <Link key={c.slug} to={`/categories/${c.slug}`} className="card p-5 transition hover:border-brand/40">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><Icon name={c.icon} className="h-5 w-5" /></span>
            <p className="mt-3 font-semibold">{c.name}</p><p className="mt-1 text-sm text-mute">{c.blurb}</p><p className="mt-3 text-xs text-mute">{n} {n === 1 ? "product" : "products"}</p>
          </Link>); })}
      </div>
    </div>
  );
}
