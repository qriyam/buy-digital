export type Variant = { id: string; label: string; price: number; inStock: boolean };
export type Category = { slug: string; name: string; blurb: string; icon: string };
export type Product = {
  id: string; slug: string; name: string; category: string; blurb: string; description: string;
  delivery: "instant" | "manual"; method: string; available: boolean; featured: boolean; popular: boolean;
  images: string[]; instructions: string; validity: string; deliveryEstimate: string; refundNote: string;
  rating: { avg: number; count: number } | null; variants: Variant[]; createdAt: string;
};
export const fromPrice = (p: Product) => Math.min(...p.variants.map((x) => x.price));
