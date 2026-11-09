import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useCart } from "../lib/cart";
import { useAuth } from "../lib/auth";
import { useCatalog } from "../lib/catalog";
import { useT } from "../lib/i18n";
import { callFn, live } from "../lib/supabase";
import { rm } from "../lib/format";
import { couponErrors, getCoupon, useQuote } from "./Cart";
import Seo from "../lib/seo";

const errors: Record<string, string> = { ...couponErrors, email_not_verified: "Verify your email address first (check your inbox).", account_suspended: "This account cannot place orders. Contact support.",
  out_of_stock: "One of the items just ran out of stock.", total_too_low: "The order total is below the minimum for payment.", too_many_pending_orders: "Too many unpaid orders. Finish or wait before trying again.",
  payment_provider_error: "The payment provider could not start. Try again shortly." };

export default function Checkout() {
  const { lines, count } = useCart();
  const { user, verified, loading } = useAuth();
  const { getByVariant } = useCatalog(); const { t } = useT();
  const { quote } = useQuote();
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const seo = <Seo title={t("checkout")} path="/checkout" description="Checkout" noindex />;
  if (!count) return <div className="mx-auto max-w-xl px-4 py-24 text-center">{seo}<h1 className="text-2xl font-bold">{t("cartEmpty")}</h1><Link to="/products" className="btn btn-primary mt-6">{t("browse")}</Link></div>;
  const notice = (x: string) => <div className="card mt-6 flex gap-3 p-5 text-sm"><AlertCircle className="h-5 w-5 shrink-0 text-brand" aria-hidden /><p>{x}</p></div>;
  const pay = async () => {
    if (busy) return; setBusy(true); setErr(null);   // blocks double submit
    try {
      const r = await callFn<{ payment_url: string }>("buydigital-create-checkout", { items: lines.map((l) => ({ variant_id: l.variantId, quantity: l.qty })), coupon_code: getCoupon() || undefined });
      window.location.assign(r.payment_url);   // payment is confirmed by the server-side webhook, never by this redirect
    } catch (e) { setErr(errors[(e as Error).message] ?? "Something went wrong. Please try again."); setBusy(false); }
  };
  return (
    <div className="mx-auto max-w-xl px-4 py-12">{seo}
      <h1 className="text-3xl font-bold tracking-tight">{t("checkout")}</h1>
      <ul className="card mt-6 divide-y divide-line">{lines.map((l) => { const f = getByVariant(l.variantId); return f ? <li key={l.variantId} className="flex justify-between p-4 text-sm"><span>{f.product.name} · {f.variant.label} × {l.qty}</span><span className="font-medium">{rm(f.variant.price * l.qty)}</span></li> : null; })}</ul>
      {quote ? <div className="mt-5 space-y-1 text-sm"><p className="flex justify-between"><span className="text-mute">{t("subtotal")}</span>{rm(Number(quote.subtotal))}</p>
        {Number(quote.discount) > 0 && <p className="flex justify-between"><span className="text-mute">{t("discount")}</span>− {rm(Number(quote.discount))}</p>}
        <p className="flex justify-between text-lg font-semibold"><span>{t("total")}</span>{rm(Number(quote.total))}</p></div> : null}
      <p className="mt-2 text-xs text-mute">{t("finalNote")}</p>
      {!live ? notice("The store backend is not connected.") : loading ? null : !user ? <div className="mt-6"><Link to="/login" className="btn btn-primary w-full">{t("loginToContinue")}</Link></div>
        : !verified ? notice(t("verifyEmail")) : <button className="btn btn-primary mt-6 w-full" onClick={pay} disabled={busy}>{busy ? t("paying") : t("pay")}</button>}
      {err && <p role="alert" className="mt-3 text-sm text-brand">{err}</p>}
      <Link to="/cart" className="btn btn-ghost mt-4">{t("backToCart")}</Link>
    </div>
  );
}
