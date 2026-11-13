import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useCatalog } from "../lib/catalog";
import { useCart } from "../lib/cart";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { callFn, live } from "../lib/supabase";
import { rm } from "../lib/format";
import Seo from "../lib/seo";

export const couponErrors: Record<string, string> = {
  coupon_not_found: "That coupon code is not valid.", coupon_expired: "That coupon has expired.", coupon_min_order: "Your order is below the coupon's minimum.",
  coupon_not_applicable: "That coupon does not apply to these items.", coupon_limit_reached: "That coupon has reached its usage limit.",
  product_unavailable: "An item in your cart is no longer available.", login_required: "Log in to apply a coupon.",
};
export const payErrors: Record<string, string> = { ...couponErrors, email_not_verified: "Verify your email address first (check your inbox).", account_suspended: "This account cannot place orders. Contact support.",
  out_of_stock: "One of the items just ran out of stock.", total_too_low: "The order total is below the minimum for payment.", too_many_pending_orders: "Too many unpaid orders. Finish or wait before trying again.",
  payment_provider_error: "The payment provider could not start. Try again shortly." };
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
  const { getByVariant } = useCatalog(); const { t } = useT(); const { user, verified, loading } = useAuth();
  const { quote, err, run } = useQuote(); const navigate = useNavigate();
  const [code, setCode] = useState(getCoupon());
  const [busy, setBusy] = useState(false), [payErr, setPayErr] = useState<string | null>(null);
  const apply = async () => { try { sessionStorage.setItem("bd.coupon", code.trim()); } catch { /* ignore */ } await run(code.trim()); };
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate("/products"));
  const pay = async () => {
    if (busy) return; setBusy(true); setPayErr(null);   // blocks double submit
    try {
      const r = await callFn<{ payment_url: string }>("buydigital-create-checkout", { items: lines.map((l) => ({ variant_id: l.variantId, quantity: l.qty })), coupon_code: getCoupon() || undefined });
      window.location.assign(r.payment_url);   // payment is confirmed by the server-side webhook, never by this redirect
    } catch (e) { setPayErr(payErrors[(e as Error).message] ?? "Something went wrong. Please try again."); setBusy(false); }
  };
  if (!lines.length) return <div className="mx-auto max-w-6xl px-4 py-24 text-center"><Seo title={t("cart")} path="/cart" description="Your BuyDigital cart" noindex /><h1 className="text-2xl font-bold">{t("cartEmpty")}</h1><Link to="/products" className="btn btn-primary mt-6">{t("continueShopping")}</Link></div>;
  const row = (a: string, b: string, bold = false) => <div className={`flex justify-between ${bold ? "text-xl font-bold" : "text-sm"}`}><span className={bold ? "" : "text-mute"}>{a}</span><span>{b}</span></div>;
  const round = "grid h-8 w-8 place-items-center rounded-full border border-line bg-white text-ink hover:bg-soft disabled:opacity-40";
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
      <Seo title={t("cart")} path="/cart" description="Your BuyDigital cart" noindex />
      <div className="flex items-center gap-3">
        <button type="button" onClick={goBack} aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-white shadow-sm transition hover:bg-soft"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("cart")}</h1>
      </div>
      <ul className="card mt-5 divide-y divide-line">
        {lines.map((l) => { const f = getByVariant(l.variantId); if (!f) return null; const { product: p, variant: v } = f; return (
          <li key={l.variantId} className="flex gap-3 p-3 sm:p-4">
            {p.images[0] ? <img src={p.images[0]} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-soft object-contain" /> : <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-soft font-bold text-brand" aria-hidden>{p.name[0]}</div>}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><Link to={`/products/${p.slug}`} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-brand sm:text-base">{p.name}</Link>
                  <p className="mt-0.5 text-xs text-mute">{v.label}{!v.inStock && " · " + t("out")}</p></div>
                <button onClick={() => remove(l.slug, l.variantId)} aria-label={`Remove ${p.name}`} className="-mr-1 -mt-1 shrink-0 rounded-lg p-2 text-mute hover:bg-soft hover:text-brand"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2" role="group" aria-label={`${t("quantity")} ${p.name}`}>
                  <button type="button" className={round} disabled={l.qty <= 1} onClick={() => setQty(l.slug, l.variantId, Math.max(1, l.qty - 1))} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
                  <span className="w-6 text-center text-sm font-medium tabular-nums">{l.qty}</span>
                  <button type="button" className={round} disabled={l.qty >= 10} onClick={() => setQty(l.slug, l.variantId, Math.min(10, l.qty + 1))} aria-label="Increase"><Plus className="h-4 w-4" /></button>
                </div>
                <p className="font-semibold">{rm(v.price * l.qty)}</p>
              </div>
            </div>
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
      <div className="mt-6 space-y-3">
        {!live ? <p className="text-sm text-mute">The store backend is not connected.</p>
          : loading ? null
          : !user ? <Link to="/login" className="btn btn-primary w-full">{t("loginToContinue")}</Link>
          : !verified ? <p className="text-sm text-mute">{t("verifyEmail")}</p>
          : <button className="btn btn-primary w-full" onClick={pay} disabled={busy}>{busy ? t("paying") : t("toCheckout")}</button>}
        {payErr && <p role="alert" className="text-sm text-brand">{payErr}</p>}
        <Link to="/products" className="btn btn-ghost w-full">{t("continueShopping")}</Link>
      </div>
    </div>
  );
}
