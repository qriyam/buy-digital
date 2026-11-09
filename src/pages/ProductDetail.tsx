import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Star } from "lucide-react";
import { useCatalog } from "../lib/catalog";
import { useCart } from "../lib/cart";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { supabase } from "../lib/supabase";
import { useFetch } from "../lib/useFetch";
import { rm } from "../lib/format";
import ProductCard from "../components/ProductCard";
import Seo from "../lib/seo";
import NotFound from "./NotFound";

const Stars = ({ n }: { n: number }) => <span className="inline-flex" aria-label={`${n} / 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-4 w-4 ${i <= n ? "fill-brand text-brand" : "text-line"}`} aria-hidden />)}</span>;

function Reviews({ productId }: { productId: string }) {
  const { t } = useT(); const { user } = useAuth();
  const [rating, setRating] = useState(5), [body, setBody] = useState(""), [done, setDone] = useState(false), [err, setErr] = useState("");
  const list = useFetch(async () => (await supabase!.from("product_reviews").select("id,rating,body,created_at").eq("product_id", productId).eq("status", "approved").order("created_at", { ascending: false }).limit(20)).data ?? [], [productId]);
  const can = useFetch(async () => {
    if (!user || !supabase) return false;
    const bought = await supabase.from("order_items").select("id,orders!inner(status)").eq("product_id", productId).in("orders.status", ["delivered", "completed"]).limit(1);
    const had = await supabase.from("product_reviews").select("id").eq("product_id", productId).eq("user_id", user.id).limit(1);
    return !!bought.data?.length && !had.data?.length;
  }, [productId, user?.id]);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr("");
    const { error } = await supabase!.from("product_reviews").insert({ product_id: productId, user_id: user!.id, rating, body: body.trim() || null });
    error ? setErr("Could not submit your review.") : setDone(true);
  };
  return (
    <section className="mt-16"><h2 className="text-xl font-bold tracking-tight">{t("reviews")}</h2>
      {(list.data ?? []).length === 0 ? <p className="mt-3 text-sm text-mute">{t("noReviews")}</p> :
        <ul className="mt-4 divide-y divide-line">{(list.data ?? []).map((r: any) => <li key={r.id} className="py-4 text-sm"><Stars n={r.rating} /> <span className="ml-2 text-xs text-mute">{t("verifiedBuyer")}</span>{r.body && <p className="mt-1">{r.body}</p>}</li>)}</ul>}
      {done ? <p className="mt-4 text-sm text-ok" role="status">{t("reviewThanks")}</p> : can.data && (
        <form onSubmit={submit} className="card mt-6 max-w-md p-4"><p className="font-medium">{t("writeReview")}</p>
          <label className="mt-3 block text-sm">{t("rating")}<select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-line px-3 py-2">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={3} className="mt-3 w-full rounded-xl border border-line px-3 py-2 text-sm" aria-label={t("reviews")} />
          {err && <p role="alert" className="mt-2 text-sm text-brand">{err}</p>}<button className="btn btn-primary mt-3">{t("submitReview")}</button></form>)}
    </section>
  );
}

export default function ProductDetail() {
  const { slug = "" } = useParams();
  const { getProduct, getCategory, products, loading } = useCatalog();
  const { add } = useCart(); const { t } = useT(); const go = useNavigate();
  const p = getProduct(slug);
  const [vid, setVid] = useState(""), [qty, setQty] = useState(1), [img, setImg] = useState(0);
  if (loading) return <p className="py-24 text-center text-mute">{t("loading")}</p>;
  if (!p) return <NotFound what={t("products")} />;
  const variant = p.variants.find((v) => v.id === vid) ?? p.variants.find((v) => v.inStock) ?? p.variants[0];
  const put = (then?: string) => { add({ slug: p.slug, variantId: variant.id, qty }); if (then) go(then); };
  const rows: [string, string][] = [[t("category"), getCategory(p.category)?.name ?? ""], [t("deliveryMethod"), p.delivery === "instant" ? t("autoDelivery") : t("teamDelivery")],
    [t("availability"), variant.inStock ? t("available") : t("out")], ...(p.deliveryEstimate ? [[t("estimate"), p.deliveryEstimate] as [string, string]] : []), ...(p.validity ? [[t("validity"), p.validity] as [string, string]] : [])];
  const related = products.filter((x) => x.slug !== p.slug).sort((a, b) => Number(b.category === p.category) - Number(a.category === p.category)).slice(0, 4);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Seo title={p.name} path={`/products/${p.slug}`} description={p.description || `${p.name} on BuyDigital`} image={p.images[0]}
        jsonLd={{ "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description, ...(p.images[0] ? { image: p.images } : {}),
          offers: { "@type": "AggregateOffer", priceCurrency: "MYR", lowPrice: Math.min(...p.variants.map((v) => v.price)), highPrice: Math.max(...p.variants.map((v) => v.price)), availability: p.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
          ...(p.rating ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating.avg, reviewCount: p.rating.count } } : {}) }} />
      <p className="text-sm text-mute"><Link to="/products" className="hover:text-brand">{t("products")}</Link> / {p.name}</p>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div>{p.images[img] ? <img src={p.images[img]} alt={p.name} className="h-72 w-full rounded-card bg-soft object-contain md:h-96" /> : <div className="grid h-72 place-items-center rounded-card bg-soft text-7xl font-bold text-brand md:h-96" aria-hidden>{p.name[0]}</div>}
          {p.images.length > 1 && <div className="mt-3 flex gap-2">{p.images.map((u, i) => <button key={u} onClick={() => setImg(i)} className={`rounded-lg border p-1 ${i === img ? "border-brand" : "border-line"}`}><img src={u} alt="" className="h-14 w-14 object-contain" loading="lazy" /></button>)}</div>}</div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{p.name}</h1>
          {p.rating && <p className="mt-1 flex items-center gap-2 text-sm text-mute"><Stars n={Math.round(p.rating.avg)} />{p.rating.avg} ({p.rating.count})</p>}
          <p className="mt-2 text-2xl font-semibold">{rm(variant.price * qty)}</p>
          <p className="mt-4 whitespace-pre-line text-mute">{p.description}</p>
          <fieldset className="mt-6"><legend className="mb-2 text-sm font-medium">{t("option")}</legend>
            <div className="flex flex-wrap gap-2">{p.variants.map((v) => <button key={v.id} onClick={() => setVid(v.id)} disabled={!v.inStock} aria-pressed={v.id === variant.id} className={`rounded-xl border px-4 py-2 text-sm disabled:opacity-40 ${v.id === variant.id ? "border-brand bg-brand/5 text-brand" : "border-line hover:bg-soft"}`}>{v.label}</button>)}</div></fieldset>
          <div className="mt-5 flex items-center gap-3"><label htmlFor="qty" className="text-sm font-medium">{t("quantity")}</label>
            <input id="qty" type="number" min={1} max={10} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} className="w-20 rounded-xl border border-line px-3 py-2 text-sm" /></div>
          <div className="mt-6 flex gap-3"><button className="btn btn-ghost flex-1" disabled={!variant.inStock} onClick={() => put()}>{t("addToCart")}</button><button className="btn btn-primary flex-1" disabled={!variant.inStock} onClick={() => put("/cart")}>{t("buyNow")}</button></div>
          <dl className="mt-8 divide-y divide-line rounded-card border border-line text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 px-4 py-3"><dt className="text-mute">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}</dl>
          {p.instructions && <div className="mt-6"><h2 className="text-sm font-semibold">{t("instructions")}</h2><p className="mt-1 whitespace-pre-line text-sm text-mute">{p.instructions}</p></div>}
          {p.refundNote && <div className="mt-4"><h2 className="text-sm font-semibold">{t("refundInfo")}</h2><p className="mt-1 whitespace-pre-line text-sm text-mute">{p.refundNote}</p></div>}
        </div>
      </div>
      <Reviews productId={p.id} />
      {related.length > 0 && <><h2 className="mt-16 text-xl font-bold tracking-tight">{t("related")}</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{related.map((x) => <ProductCard key={x.slug} p={x} />)}</div></>}
    </div>
  );
}
