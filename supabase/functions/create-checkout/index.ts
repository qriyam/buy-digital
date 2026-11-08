// Prices, stock and coupons are ALL computed here. The browser only sends variant ids and quantities.
import { serve, readJson, HttpError } from "../_shared/http.ts";
import { authed, profileFor } from "../_shared/auth.ts";
import { db } from "../_shared/db.ts";
import { createBill } from "../_shared/toyyibpay.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_TOTAL_SEN = 100; // Gateway minimum is believed to be RM 1.00. Confirm for your ToyyibPay account.
const fmt = (sen: number) => (sen / 100).toFixed(2);

type Body = { items?: { variant_id: string; quantity: number }[]; coupon_code?: string };

async function abort(orderId: string) {
  await db.from("inventory_items")
    .update({ status: "available", reserved_order_item_id: null, reserved_until: null })
    .in("reserved_order_item_id", ((await db.from("order_items").select("id").eq("order_id", orderId)).data ?? []).map((i) => i.id))
    .eq("status", "reserved");
  await db.from("coupon_redemptions").delete().eq("order_id", orderId);
  await db.from("payments").delete().eq("order_id", orderId);
  await db.from("orders").delete().eq("id", orderId);
}

serve(async (req) => {
  const me = await authed(req);
  if (!me.emailVerified) throw new HttpError(403, "email_not_verified");
  const profile = await profileFor(me.uid);
  const body = await readJson<Body>(req);

  // 1. Validate the cart shape
  const qty = new Map<string, number>();
  for (const i of body.items ?? []) {
    if (!UUID.test(String(i.variant_id)) || !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > 10)
      throw new HttpError(400, "invalid_item");
    qty.set(i.variant_id, Math.min(10, (qty.get(i.variant_id) ?? 0) + i.quantity));
  }
  if (!qty.size || qty.size > 20) throw new HttpError(400, "invalid_cart");

  // 2. Basic abuse limit: max 5 unpaid orders per hour
  const since = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await db.from("orders").select("id", { count: "exact", head: true })
    .eq("user_id", profile.id).eq("status", "pending_payment").gte("created_at", since);
  if ((count ?? 0) >= 5) throw new HttpError(429, "too_many_pending_orders");

  await db.rpc("release_expired_reservations");

  // 3. Load real prices from the database
  const { data: variants } = await db.from("product_variants")
    .select("id,label,price,currency,is_available,products!inner(id,name,category_id,delivery_method)")
    .in("id", [...qty.keys()]).eq("is_active", true)
    .eq("products.is_active", true).is("products.archived_at", null);
  if (!variants || variants.length !== qty.size) throw new HttpError(404, "product_unavailable");

  type Line = { variant: any; product: any; qty: number; unit: number; total: number };
  const lines: Line[] = variants.map((v: any) => {
    if (!v.is_available || v.currency !== "MYR") throw new HttpError(409, "product_unavailable");
    const unit = Math.round(Number(v.price) * 100);
    const q = qty.get(v.id)!;
    return { variant: v, product: v.products, qty: q, unit, total: unit * q };
  });
  const subtotal = lines.reduce((a, l) => a + l.total, 0);

  // 4. Coupon (validated here, never in the browser)
  let discount = 0;
  let couponId: string | null = null;
  if (body.coupon_code) {
    const code = String(body.coupon_code).trim();
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(code)) throw new HttpError(422, "coupon_not_found");
    const { data: c } = await db.from("coupons").select("*")
      .ilike("code", code.replace(/[_%]/g, "\\$&")).eq("is_active", true).maybeSingle();
    if (!c) throw new HttpError(422, "coupon_not_found");
    const now = Date.now();
    if ((c.starts_at && Date.parse(c.starts_at) > now) || (c.expires_at && Date.parse(c.expires_at) < now))
      throw new HttpError(422, "coupon_expired");
    if (subtotal < Math.round(Number(c.min_order) * 100)) throw new HttpError(422, "coupon_min_order");

    const restricted = (c.product_ids?.length ?? 0) > 0 || (c.category_ids?.length ?? 0) > 0;
    const eligible = lines.filter((l) => !restricted ||
      c.product_ids?.includes(l.product.id) || c.category_ids?.includes(l.product.category_id))
      .reduce((a, l) => a + l.total, 0);
    if (eligible === 0) throw new HttpError(422, "coupon_not_applicable");

    if (c.usage_limit != null) {
      const { count: used } = await db.from("coupon_redemptions").select("id", { count: "exact", head: true }).eq("coupon_id", c.id);
      if ((used ?? 0) >= c.usage_limit) throw new HttpError(422, "coupon_limit_reached");
    }
    const { count: mine } = await db.from("coupon_redemptions").select("id", { count: "exact", head: true })
      .eq("coupon_id", c.id).eq("user_id", profile.id);
    if ((mine ?? 0) >= c.per_user_limit) throw new HttpError(422, "coupon_limit_reached");

    discount = c.discount_type === "percentage"
      ? Math.floor(eligible * Number(c.discount_value) / 100)
      : Math.round(Number(c.discount_value) * 100);
    discount = Math.min(discount, eligible);
    if (c.max_discount != null) discount = Math.min(discount, Math.round(Number(c.max_discount) * 100));
    couponId = c.id;
  }

  const total = subtotal - discount;
  if (total < MIN_TOTAL_SEN) throw new HttpError(422, "total_too_low");

  // 5. Create the order
  const { data: order, error: oErr } = await db.from("orders").insert({
    user_id: profile.id, email: profile.email, currency: "MYR", coupon_id: couponId,
    subtotal: fmt(subtotal), discount_total: fmt(discount), total: fmt(total),
  }).select("id,order_number").single();
  if (oErr) throw oErr;

  try {
    const { data: items, error: iErr } = await db.from("order_items").insert(lines.map((l) => ({
      order_id: order.id, product_id: l.product.id, variant_id: l.variant.id,
      product_name: l.product.name, variant_label: l.variant.label,
      unit_price: fmt(l.unit), quantity: l.qty, line_total: fmt(l.total),
    }))).select("id,variant_id");
    if (iErr) throw iErr;

    // 6. Reserve code stock atomically (fails the whole checkout if any line is short)
    for (const l of lines.filter((x) => x.product.delivery_method === "license_key")) {
      const itemId = items!.find((i) => i.variant_id === l.variant.id)!.id;
      const { error } = await db.rpc("reserve_inventory", { p_variant: l.variant.id, p_order_item: itemId, p_qty: l.qty });
      if (error) throw new HttpError(409, String(error.message).includes("insufficient_stock") ? "out_of_stock" : "reserve_failed");
    }

    if (couponId) {
      const { error } = await db.from("coupon_redemptions")
        .insert({ coupon_id: couponId, order_id: order.id, user_id: profile.id, amount: fmt(discount) });
      if (error) throw new HttpError(422, "coupon_limit_reached");
    }

    // 7. Payment record + ToyyibPay bill
    const { data: pay, error: pErr } = await db.from("payments").insert({
      order_id: order.id, provider: "toyyibpay", amount: fmt(total), currency: "MYR", status: "pending",
    }).select("id").single();
    if (pErr) throw pErr;

    let bill;
    try {
      bill = await createBill({
        name: profile.full_name ?? profile.email.split("@")[0], email: profile.email, phone: profile.phone ?? "",
        amountSen: total, description: `BuyDigital order ${order.order_number}`, reference: order.order_number,
        callbackUrl: `${Deno.env.get("SUPABASE_URL")}/functions/v1/toyyibpay-webhook`,
        returnUrl: `${Deno.env.get("SITE_URL")}/account/orders/${order.id}`,
      });
    } catch (e) { console.error(e); throw new HttpError(502, "payment_provider_error"); }

    await db.from("payments").update({ provider_ref: bill.billCode }).eq("id", pay.id);
    await db.from("order_events").insert({
      order_id: order.id, status: "pending_payment", message: "Order created. Waiting for payment.", actor_id: profile.id,
    });
    return { order_id: order.id, order_number: order.order_number, payment_url: bill.url };
  } catch (e) {
    await abort(order.id);
    throw e;
  }
});
