import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { categories as demoCats, products as demoProducts, type Category, type Product } from "../data/catalog";
import { live, supabase } from "./supabase";

type Ctx = { categories: Category[]; products: Product[]; loading: boolean; demo: boolean; error: boolean;
  getProduct: (slug: string) => Product | undefined; getCategory: (slug: string) => Category | undefined };
const C = createContext<Ctx | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [categories, setCats] = useState<Category[]>(live ? [] : demoCats);
  const [products, setProducts] = useState<Product[]>(live ? [] : demoProducts);
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from("categories").select("slug,name,description,icon").order("sort_order"),
        supabase.from("products").select("slug,name,description,delivery_method,is_featured,categories(slug),product_variants(id,label,price,is_available,sort_order)").order("created_at"),
      ]);
      if (c.error || p.error) { setError(true); setLoading(false); return; }
      setCats((c.data ?? []).map((x: any) => ({ slug: x.slug, name: x.name, blurb: x.description ?? "", icon: x.icon ?? "Package" })));
      setProducts((p.data ?? []).map((x: any): Product => {
        const vs = [...(x.product_variants ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
        return { slug: x.slug, name: x.name, category: x.categories?.slug ?? "other", blurb: (x.description ?? "").slice(0, 80), description: x.description ?? "",
          delivery: x.delivery_method === "license_key" ? "instant" : "manual", available: vs.some((v: any) => v.is_available), featured: x.is_featured,
          variants: vs.map((v: any) => ({ id: v.id, label: v.label, price: Number(v.price) })) };
      }));
      setLoading(false);
    })();
  }, []);
  const value: Ctx = { categories, products, loading, error, demo: !live,
    getProduct: (s) => products.find((p) => p.slug === s), getCategory: (s) => categories.find((c) => c.slug === s) };
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useCatalog = () => { const c = useContext(C); if (!c) throw new Error("CatalogProvider missing"); return c; };
