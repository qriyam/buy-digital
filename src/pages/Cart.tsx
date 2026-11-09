import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useCatalog } from "../lib/catalog";
import { useCart } from "../lib/cart";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { callFn } from "../lib/supabase";
import { rm } from "../lib/format";
import Seo from "../lib/seo";

export const couponErrors: Record<string, string> = {
  coupon_not_found: "That coupon code is not valid.", coupon_expired: "That coupon has expired.", coupon_min_order: "Your order is below the coupon's minimum.",
  coupon_not_applicable: "That coupon does not apply to these items.", coupon_limit_reached: "That coupon has reached its usage limit.",
  product_unavailable: "An item in your cart is no longer available.", login_required: "Log in to apply a coupon.",
};
export const getCoupon = () => { try { return sessionStorage.getItem("bd.coupon") ?? ""; } catch { return ""; } };

type Quote = { subtotal: string; discount: string; total: string };
export function useQuote() {
  const { lines } = useCart(); const { user } = useAuth();
  const [quote, setQuote] = useState<Quote | null>(null), [err, setErr] = useState<string | null>(null);
  const key = lines.map((l) => l.variantId + l.qty).join(",");
  const run = async (coupon: string) => {
    if (!user || !lines.length) { setQuote(null); return; }
    try { setQuote(await callFn<Quote>("buydigital-quote-cart", { items: lines.map((l) => ({ variant_id: l.variantId, quantity: l.qty })), coupon_code: coupon || undefined })); setErr(null); }
    catch (e) { setQuote(null); setErr(couponErrors[(e as Error).message] ?? "Could not price your cart."); if (coupon) try { sessionStorage.removeItem("bd.coupon"); } catch { /* ignore */ } }
  };
  useEffect(() => { run(getCoupon()); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [key, user?.id]);
  return { quote, err, run };
}

export default function Cart() {
  const { lines, subtotal, setQty, remove } = useCart();
  const { getByVariant } = useCatalog(); const { t } = useT(); const { user } = useAuth();
  const { quote, err, run } = useQuote();
  const [code, setCode] = useState(getCoupon());
  const apply = async () => { try { sessionStorage.setItem("bd.coupon", code.trim()); } catch { /* ignore */ } await run(code.trim()); };
  if (!lines.length) return <div className="mx-auto max-w-6xl px-4 py-24 text-center"><Seo title={t("cart")} path="/cart" description="Your BuyDigital cart" noindex /><h1 className="text-2xl font-bold">{t("cartEmpty")}</h1><Link to="/products" className="btn btn-primary mt-6">{t("continueShopping")}</Link></div>;
  const row = (a: string, b: string, bold = false) => <div className={`flex justify-between ${bold ? "text-xl font-bold" : "text-sm"}`}><span className={bold ? "" : "text-mute"}>{a}</span><span>{b}</span></div>;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Seo title={t("cart")} path="/cart" description="Your BuyDigital cart" noindex />
      <h1 className="text-3xl font-bold tracking-tight">{t("cart")}</h1>
      <ul className="card mt-6 divide-y divide-line">
        {lines.map((l) => { const f = getByVariant(l.variantId); if (!f) return null; const { product: p, variant: v } = f; return (
          <li key={l.variantId} className="flex flex-wrap items-center gap-4 p-4">
            {p.images[0] ? <img src={p.images[0]} alt="" className="h-14 w-14 rounded-xl bg-soft object-contain" /> : <div className="grid h-14 w-14 place-items-center rounded-xl bg-soft font-bold text-brand" aria-hidden>{p.name[0]}</div>}
            <div className="min-w-0 flex-1"><Link to={`/products/${p.slug}`} className="font-medium hover:text-brand">{p.name}</Link><p className="text-sm text-mute">{v.label} · {rm(v.price)}{!v.inStock && " · " + t("out")}</p></div>
            <input type="number" min={1} max={10} value={l.qty} onChange={(e) => setQty(l.slug, l.variantId, Number(e.target.value) || 1)} aria-label={`${t("quantity")} ${p.name}`} className="w-16 rounded-xl border border-line px-2 py-1.5 text-sm" />
            <p className="w-24 text-right font-semibold">{rm(v.price * l.qty)}</p>
            <button onClick={() => remove(l.slug, l.variantId)} aria-label={`Remove ${p.name}`} className="rounded-lg p-2 text-mute hover:bg-soft hover:text-brand"><Trash2 className="h-4 w-4" /></button>
          </li>); })}
      </ul>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div><label className="text-sm font-medium" htmlFor="coupon">{t("coupon")}</label>
          <div className="mt-1 flex gap-2"><input id="coupon" value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} className="w-full rounded-xl border border-line px-3 py-2.5 text-sm" /><button className="btn btn-ghost" onClick={apply} disabled={!user}>{t("apply")}</button></div>
          {!user && <p className="mt-1 text-xs text-mute"><Link to="/login" className="text-brand">{t("loginToContinue")}</Link></p>}
          {err && <p role="alert" className="mt-2 text-sm text-brand">{err}</p>}</div>
        <div className="space-y-2">
          {row(t("subtotal"), rm(quote ? Number(quote.subtotal) : subtotal))}
          {quote && Number(quote.discount) > 0 && row(t("discount"), `− ${rm(Number(quote.discount))}`)}
          {row(t("total"), rm(quote ? Number(quote.total) : subtotal), true)}
          <p className="text-xs text-mute">{t("finalNote")}</p></div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3"><Link to="/products" className="btn btn-ghost">{t("continueShopping")}</Link><Link to="/checkout" className="btn btn-primary flex-1">{t("toCheckout")}</Link></div>
    </div>
  );
}
