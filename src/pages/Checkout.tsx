import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useCart } from "../lib/cart";
import { rm } from "../lib/format";
export default function Checkout() {
  const { subtotal, count } = useCart();
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
      <div className="card mt-6 flex gap-3 p-5 text-sm"><AlertCircle className="h-5 w-5 shrink-0 text-brand" aria-hidden />
        <p>Payments are not connected yet. The ToyyibPay checkout function is in <code>supabase/functions</code> but needs your credentials and a deployed database before orders can be placed. No order or payment has been created.</p></div>
      <p className="mt-6 text-mute">{count} item(s) · {rm(subtotal)}</p>
      <Link to="/cart" className="btn btn-ghost mt-4">Back to cart</Link>
    </div>
  );
}
