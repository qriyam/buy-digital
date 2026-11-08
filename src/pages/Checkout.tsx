import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useCart } from "../lib/cart";
import { useAuth } from "../lib/auth";
import { useCatalog } from "../lib/catalog";
import { callFn } from "../lib/supabase";
import { live } from "../lib/supabase";
import { rm } from "../lib/format";

const errors: Record<string, string> = {
  login_required: "Please log in to check out.", email_not_verified: "Verify your email address first (check your inbox).",
  account_suspended: "This account cannot place orders. Contact support.", product_unavailable: "One of the items is no longer available. Update your cart.",
  out_of_stock: "One of the items just ran out of stock.", coupon_not_found: "That coupon code is not valid.", coupon_expired: "That coupon has expired.",
  coupon_min_order: "Your order is below the coupon's minimum.", coupon_not_applicable: "That coupon does not apply to these items.",
  coupon_limit_reached: "That coupon has reached its usage limit.", total_too_low: "The order total is below the minimum for payment.",
  too_many_pending_orders: "Too many unpaid orders. Finish or wait before trying again.", payment_provider_error: "The payment provider could not start. Try again shortly.",
};

export default function Checkout() {
  const { lines, subtotal, count } = useCart();
  const { user, verified, loading } = useAuth();
  const { getProduct } = useCatalog();
  const [coupon, setCoupon] = useState(""), [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);

  if (!count) return <div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="text-2xl font-bold">Nothing to check out</h1><Link to="/products" className="btn btn-primary mt-6">Browse products</Link></div>;
  const notice = (t: string) => <div className="card mt-6 flex gap-3 p-5 text-sm"><AlertCircle className="h-5 w-5 shrink-0 text-brand" aria-hidden /><p>{t}</p></div>;

  const pay = async () => {
    if (busy) return;           // block double submit
    setBusy(true); setErr(null);
    try {
      const r = await callFn<{ payment_url: string }>("create-checkout", {
        items: lines.map((l) => ({ variant_id: l.variantId, quantity: l.qty })), coupon_code: coupon.trim() || undefined });
      window.location.assign(r.payment_url);   // payment is confirmed server-side by the webhook, never by this redirect
    } catch (e) { setErr(errors[(e as Error).message] ?? "Something went wrong. Please try again."); setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
      <ul className="card mt-6 divide-y divide-line">{lines.map((l) => { const p = getProduct(l.slug); const v = p?.variants.find((x) => x.id === l.variantId); return v && p ? (
        <li key={l.slug + l.variantId} className="flex justify-between p-4 text-sm"><span>{p.name} · {v.label} × {l.qty}</span><span className="font-medium">{rm(v.price * l.qty)}</span></li>) : null; })}</ul>
      <label className="mt-5 block text-sm font-medium">Coupon code (optional)<input value={coupon} onChange={(e) => setCoupon(e.target.value)} maxLength={40} className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm" /></label>
      <p className="mt-5 flex justify-between text-lg font-semibold"><span>Estimated total</span><span>{rm(subtotal)}</span></p>
      <p className="text-xs text-mute">The final amount, including any coupon, is calculated on the server before you pay.</p>
      {!live ? notice("Demo mode: no backend is connected, so orders cannot be placed.")
        : loading ? null
        : !user ? <div className="mt-6"><Link to="/login" className="btn btn-primary w-full">Log in to continue</Link></div>
        : !verified ? notice("Please verify your email address before ordering.")
        : <button className="btn btn-primary mt-6 w-full" onClick={pay} disabled={busy}>{busy ? "Starting payment…" : "Pay securely"}</button>}
      {err && <p role="alert" className="mt-3 text-sm text-brand">{err}</p>}
      <Link to="/cart" className="btn btn-ghost mt-4">Back to cart</Link>
    </div>
  );
}
