import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Category, Product } from "../data/catalog";
import { live, supabase } from "./supabase";

type Ctx = { categories: Category[]; products: Product[]; loading: boolean; error: boolean; configured: boolean; reload: () => void;
  getProduct: (slug: string) => Product | undefined; getCategory: (slug: string) => Category | undefined; getByVariant: (id: string) => { product: Product; variant: Product["variants"][number] } | undefined };
const C = createContext<Ctx | null>(null);
const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
export const imageUrl = (path: string) => `${base}/storage/v1/object/public/buydigital-product-images/${path}`;

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [categories, setCats] = useState<Category[]>([]), [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(live), [error, setError] = useState(false), [tick, setTick] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const [c, p, a, r] = await Promise.all([
        supabase.from("categories").select("slug,name,description,icon,image_path").order("sort_order"),
        supabase.from("products").select("id,slug,name,description,delivery_method,delivery_estimate,validity,instructions,refund_note,is_featured,is_popular,created_at,categories(slug),product_variants(id,label,price,sort_order),product_images(path,sort_order)").order("sort_order").order("created_at", { ascending: false }),
        supabase.from("variant_availability").select("variant_id,in_stock"), supabase.from("product_rating_summary").select("product_id,average,review_count")]);
      if (c.error || p.error) { setError(true); setLoading(false); return; }
      const stock = new Map((a.data ?? []).map((x: any) => [x.variant_id, !!x.in_stock]));
      const rating = new Map((r.data ?? []).map((x: any) => [x.product_id, { avg: Number(x.average), count: x.review_count }]));
      setCats((c.data ?? []).map((x: any) => ({ slug: x.slug, name: x.name, blurb: x.description ?? "", icon: x.icon ?? "Package", image: x.image_path ? imageUrl(x.image_path) : undefined })));
      setProducts((p.data ?? []).map((x: any): Product => {
        const vs = [...(x.product_variants ?? [])].sort((m: any, n: any) => m.sort_order - n.sort_order).map((v: any) => ({ id: v.id, label: v.label, price: Number(v.price), inStock: stock.get(v.id) ?? false }));
        const imgs = [...(x.product_images ?? [])].sort((m: any, n: any) => m.sort_order - n.sort_order).map((i: any) => imageUrl(i.path));
        return { id: x.id, slug: x.slug, name: x.name, category: x.categories?.slug ?? "other", description: x.description ?? "", blurb: (x.description ?? "").split(/[.\n]/)[0].slice(0, 90),
          delivery: x.delivery_method === "license_key" || x.delivery_method === "file" ? "instant" : "manual", method: x.delivery_method, available: vs.some((v) => v.inStock), featured: x.is_featured, popular: x.is_popular,
          images: imgs, instructions: x.instructions ?? "", validity: x.validity ?? "", deliveryEstimate: x.delivery_estimate ?? "", refundNote: x.refund_note ?? "", rating: rating.get(x.id) ?? null, variants: vs, createdAt: x.created_at };
      }).filter((x) => x.variants.length > 0));
      setLoading(false);
    })();
  }, [tick]);
  const value: Ctx = { categories, products, loading, error, configured: live, reload: () => setTick((n) => n + 1),
    getProduct: (s) => products.find((p) => p.slug === s), getCategory: (s) => categories.find((c) => c.slug === s),
    getByVariant: (id) => { for (const p of products) { const v = p.variants.find((x) => x.id === id); if (v) return { product: p, variant: v }; } } };
  return <C.Provider value={value}>{children}</C.Provider>;
}
export const useCatalog = () => { const c = useContext(C); if (!c) throw new Error("CatalogProvider missing"); return c; };
