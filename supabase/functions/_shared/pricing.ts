// Single source of truth for cart pricing. Used by quote-cart (preview) and create-checkout (real order).
import { db } from "./db.ts";
import { HttpError } from "./http.ts";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MIN_TOTAL_SEN = 100; // Gateway minimum is believed to be RM 1.00. Confirm for your ToyyibPay account.
export const fmt = (sen: number) => (sen / 100).toFixed(2);

export type Body = { items?: { variant_id: string; quantity: number }[]; coupon_code?: string };
export type Line = { variant: any; product: any; qty: number; unit: number; total: number };
export type Priced = { lines: Line[]; subtotal: number; discount: number; couponId: string | null; total: number; qty: Map<string, number> };

export function parseCart(body: Body) {
  const qty = new Map<string, number>();
  for (const i of body.items ?? []) {
    if (!UUID.test(String(i.variant_id)) || !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 10) throw new HttpError(400, "invalid_item");
    qty.set(i.variant_id, Math.min(10, (qty.get(i.variant_id) ?? 0) + i.quantity));
  }
  if (!qty.size || qty.size > 20) throw new HttpError(400, "invalid_cart");
  return qty;
}

export async function priceCart(profileId: string, body: Body, qty: Map<string, number>): Promise<Priced> {
  const { data: variants } = await db.from("product_variants")
    .select("id,label,price,currency,is_available,products!inner(id,name,category_id,delivery_method)")
    .in("id", [...qty.keys()]).eq("is_active", true).eq("products.is_active", true).is("products.archived_at", null);
  if (!variants || variants.length !== qty.size) throw new HttpError(404, "product_unavailable");

  const lines: Line[] = variants.map((v: any) => {
    if (!v.is_available || v.currency !== "MYR") throw new HttpError(409, "product_unavailable");
    const unit = Math.round(Number(v.price) * 100);
    const q = qty.get(v.id)!;
    return { variant: v, product: v.products, qty: q, unit, total: unit * q };
  });
  const subtotal = lines.reduce((a, l) => a + l.total, 0);

  let discount = 0, couponId: string | null = null;
  if (body.coupon_code) {
    const code = String(body.coupon_code).trim();
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(code)) throw new HttpError(422, "coupon_not_found");
    const { data: c } = await db.from("coupons").select("*").ilike("code", code.replace(/[_%]/g, "\\$&")).eq("is_active", true).maybeSingle();
    if (!c) throw new HttpError(422, "coupon_not_found");
    const now = Date.now();
    if ((c.starts_at && Date.parse(c.starts_at) > now) || (c.expires_at && Date.parse(c.expires_at) < now)) throw new HttpError(422, "coupon_expired");
    if (subtotal < Math.round(Number(c.min_order) * 100)) throw new HttpError(422, "coupon_min_order");

    const restricted = (c.product_ids?.length ?? 0) > 0 || (c.category_ids?.length ?? 0) > 0;
    const eligible = lines.filter((l) => !restricted || c.product_ids?.includes(l.product.id) || c.category_ids?.includes(l.product.category_id)).reduce((a, l) => a + l.total, 0);
    if (eligible === 0) throw new HttpError(422, "coupon_not_applicable");

    if (c.usage_limit != null) {
      const { count: used } = await db.from("coupon_redemptions").select("id", { count: "exact", head: true }).eq("coupon_id", c.id);
      if ((used ?? 0) >= c.usage_limit) throw new HttpError(422, "coupon_limit_reached");
    }
    const { count: mine } = await db.from("coupon_redemptions").select("id", { count: "exact", head: true }).eq("coupon_id", c.id).eq("user_id", profileId);
    if ((mine ?? 0) >= c.per_user_limit) throw new HttpError(422, "coupon_limit_reached");

    discount = c.discount_type === "percentage" ? Math.floor(eligible * Number(c.discount_value) / 100) : Math.round(Number(c.discount_value) * 100);
    discount = Math.min(discount, eligible);
    if (c.max_discount != null) discount = Math.min(discount, Math.round(Number(c.max_discount) * 100));
    couponId = c.id;
  }
  return { lines, subtotal, discount, couponId, total: subtotal - discount, qty };
}
