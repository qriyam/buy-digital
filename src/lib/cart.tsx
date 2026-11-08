import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getProduct } from "../data/catalog";

export type Line = { slug: string; variantId: string; qty: number };
type Ctx = { lines: Line[]; count: number; subtotal: number; add: (l: Line) => void; setQty: (slug: string, variantId: string, qty: number) => void; remove: (slug: string, variantId: string) => void; clear: () => void };
const C = createContext<Ctx | null>(null);
const KEY = "buydigital.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<Line[]>(() => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* storage unavailable */ } }, [lines]);
  const same = (a: Line, s: string, v: string) => a.slug === s && a.variantId === v;
  const value = useMemo<Ctx>(() => ({
    lines,
    count: lines.reduce((n, l) => n + l.qty, 0),
    // Display only. The server recalculates every price at checkout.
    subtotal: lines.reduce((n, l) => n + (getProduct(l.slug)?.variants.find((x) => x.id === l.variantId)?.price ?? 0) * l.qty, 0),
    add: (l) => setLines((ls) => ls.some((x) => same(x, l.slug, l.variantId)) ? ls.map((x) => same(x, l.slug, l.variantId) ? { ...x, qty: Math.min(x.qty + l.qty, 10) } : x) : [...ls, l]),
    setQty: (s, v, q) => setLines((ls) => ls.map((x) => same(x, s, v) ? { ...x, qty: Math.max(1, Math.min(q, 10)) } : x)),
    remove: (s, v) => setLines((ls) => ls.filter((x) => !same(x, s, v))),
    clear: () => setLines([]),
  }), [lines]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useCart = () => { const c = useContext(C); if (!c) throw new Error("CartProvider missing"); return c; };
