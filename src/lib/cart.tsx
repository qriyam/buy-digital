import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useCatalog } from "./catalog";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

export type Line = { slug: string; variantId: string; qty: number };
type Ctx = { lines: Line[]; count: number; subtotal: number; add: (l: Line) => void; setQty: (slug: string, variantId: string, qty: number) => void; remove: (slug: string, variantId: string) => void; clear: () => void };
const C = createContext<Ctx | null>(null);
const KEY = "buydigital.cart.v2";

export function CartProvider({ children }: { children: ReactNode }) {
  const { getByVariant, loading } = useCatalog();
  const { user } = useAuth();
  const [lines, setLines] = useState<Line[]>(() => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } });
  const merged = useRef<string | null>(null);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* storage unavailable */ } }, [lines]);

  // On login: merge the guest cart into the saved account cart, then keep the account cart in sync.
  useEffect(() => {
    if (!supabase || !user || loading || merged.current === user.id) return;
    merged.current = user.id;
    (async () => {
      const { data: cart } = await supabase.from("carts").upsert({ user_id: user.id }, { onConflict: "user_id" }).select("id").single();
      if (!cart) return;
      const { data: saved } = await supabase.from("cart_items").select("variant_id,quantity").eq("cart_id", cart.id);
      const map = new Map<string, number>();
      (saved ?? []).forEach((r: any) => map.set(r.variant_id, r.quantity));
      setLines((cur) => {
        cur.forEach((l) => map.set(l.variantId, Math.min(10, (map.get(l.variantId) ?? 0) + l.qty)));
        const next: Line[] = []; map.forEach((qty, variantId) => { const f = getByVariant(variantId); if (f) next.push({ slug: f.product.slug, variantId, qty }); });
        return next;
      });
    })();
  }, [user, loading, getByVariant]);
  useEffect(() => { if (!user) merged.current = null; }, [user]);

  useEffect(() => {   // write-through for signed-in users
    if (!supabase || !user || merged.current !== user.id) return;
    const t = setTimeout(async () => {
      const { data: cart } = await supabase!.from("carts").select("id").eq("user_id", user.id).maybeSingle();
      if (!cart) return;
      await supabase!.from("cart_items").delete().eq("cart_id", cart.id);
      if (lines.length) await supabase!.from("cart_items").insert(lines.map((l) => ({ cart_id: cart.id, variant_id: l.variantId, quantity: l.qty })));
    }, 600);
    return () => clearTimeout(t);
  }, [lines, user]);

  const same = (a: Line, s: string, v: string) => a.slug === s && a.variantId === v;
  const value = useMemo<Ctx>(() => ({
    lines, count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal: lines.reduce((n, l) => n + (getByVariant(l.variantId)?.variant.price ?? 0) * l.qty, 0),   // display only; the server prices the order
    add: (l) => setLines((ls) => ls.some((x) => same(x, l.slug, l.variantId)) ? ls.map((x) => same(x, l.slug, l.variantId) ? { ...x, qty: Math.min(x.qty + l.qty, 10) } : x) : [...ls, l]),
    setQty: (s, v, q) => setLines((ls) => ls.map((x) => same(x, s, v) ? { ...x, qty: Math.max(1, Math.min(q, 10)) } : x)),
    remove: (s, v) => setLines((ls) => ls.filter((x) => !same(x, s, v))),
    clear: () => setLines([]),
  }), [lines, getByVariant]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useCart = () => { const c = useContext(C); if (!c) throw new Error("CartProvider missing"); return c; };
