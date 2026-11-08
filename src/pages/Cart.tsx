import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useCatalog } from "../lib/catalog";
import { rm } from "../lib/format";
import { useCart } from "../lib/cart";
export default function Cart() {
  const { lines, subtotal, setQty, remove } = useCart();
  const { getProduct } = useCatalog();
  if (!lines.length) return <div className="mx-auto max-w-6xl px-4 py-24 text-center"><h1 className="text-2xl font-bold">Your cart is empty</h1><Link to="/products" className="btn btn-primary mt-6">Continue Shopping</Link></div>;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Cart</h1>
      <ul className="mt-6 divide-y divide-line card">
        {lines.map((l) => { const p = getProduct(l.slug); const v = p?.variants.find((x) => x.id === l.variantId); if (!p || !v) return null; return (
          <li key={l.slug + l.variantId} className="flex items-center gap-4 p-4">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-soft font-bold text-brand">{p.name[0]}</div>
            <div className="min-w-0 flex-1"><p className="font-medium">{p.name}</p><p className="text-sm text-mute">{v.label} · {rm(v.price)}</p></div>
            <input type="number" min={1} max={10} value={l.qty} onChange={(e) => setQty(l.slug, l.variantId, Number(e.target.value) || 1)} aria-label={`Quantity for ${p.name}`} className="w-16 rounded-xl border border-line px-2 py-1.5 text-sm" />
            <p className="w-24 text-right font-semibold">{rm(v.price * l.qty)}</p>
            <button onClick={() => remove(l.slug, l.variantId)} aria-label={`Remove ${p.name}`} className="rounded-lg p-2 text-mute hover:bg-soft hover:text-brand"><Trash2 className="h-4 w-4" /></button>
          </li>); })}
      </ul>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <Link to="/products" className="btn btn-ghost">Continue Shopping</Link>
        <div className="text-right"><p className="text-sm text-mute">Subtotal</p><p className="text-2xl font-bold">{rm(subtotal)}</p><p className="mt-1 text-xs text-mute">Final total is calculated on the server at checkout.</p></div>
      </div>
      <Link to="/checkout" className="btn btn-primary mt-6 w-full">Proceed to Checkout</Link>
    </div>
  );
}
