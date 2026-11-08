import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCatalog } from "../lib/catalog";
import { rm } from "../lib/format";
import { useCart } from "../lib/cart";
import ProductCard from "../components/ProductCard";
import NotFound from "./NotFound";

export default function ProductDetail() {
  const { slug = "" } = useParams();
  const { getProduct, getCategory, products, loading } = useCatalog();
  const p = getProduct(slug);
  const { add } = useCart();
  const go = useNavigate();
  const [vid, setVid] = useState(p?.variants[0].id ?? "");
  const [qty, setQty] = useState(1);
  if (loading) return <p className="py-24 text-center text-mute">Loading…</p>;
  if (!p) return <NotFound what="Product" />;
  const variant = p.variants.find((v) => v.id === vid) ?? p.variants[0];
  const put = (then?: string) => { add({ slug: p.slug, variantId: variant.id, qty }); if (then) go(then); };
  const rows: [string, string][] = [["Category", getCategory(p.category)?.name ?? ""], ["Delivery", p.delivery === "instant" ? "Automatic after verified payment" : "Fulfilled by our team after verified payment"], ["Availability", p.available ? "Available" : "Out of stock"]];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm text-mute"><Link to="/products" className="hover:text-brand">Products</Link> / {p.name}</p>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="grid h-72 place-items-center rounded-card bg-soft text-7xl font-bold text-brand md:h-96">{p.name[0]}</div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{p.name}</h1>
          <p className="mt-2 text-2xl font-semibold">{rm(variant.price * qty)}</p>
          <p className="mt-4 text-mute">{p.description}</p>
          <fieldset className="mt-6"><legend className="mb-2 text-sm font-medium">Option</legend>
            <div className="flex flex-wrap gap-2">{p.variants.map((v) => <button key={v.id} onClick={() => setVid(v.id)} aria-pressed={v.id === variant.id} className={`rounded-xl border px-4 py-2 text-sm ${v.id === variant.id ? "border-brand bg-brand/5 text-brand" : "border-line hover:bg-soft"}`}>{v.label}</button>)}</div>
          </fieldset>
          <div className="mt-5 flex items-center gap-3"><label htmlFor="qty" className="text-sm font-medium">Quantity</label>
            <input id="qty" type="number" min={1} max={10} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} className="w-20 rounded-xl border border-line px-3 py-2 text-sm" /></div>
          <div className="mt-6 flex gap-3"><button className="btn btn-ghost flex-1" disabled={!p.available} onClick={() => put()}>Add to Cart</button><button className="btn btn-primary flex-1" disabled={!p.available} onClick={() => put("/cart")}>Buy Now</button></div>
          <dl className="mt-8 divide-y divide-line rounded-card border border-line text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 px-4 py-3"><dt className="text-mute">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}</dl>
        </div>
      </div>
      <h2 className="mt-16 text-xl font-bold tracking-tight">Related products</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.filter((x) => x.slug !== p.slug && x.category === p.category).concat(products.filter((x) => x.slug !== p.slug && x.category !== p.category)).slice(0, 4).map((x) => <ProductCard key={x.slug} p={x} />)}</div>
    </div>
  );
}
