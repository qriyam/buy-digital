// Prices, stock and coupons are ALL computed here. The browser only sends variant ids and quantities.
import { serve, readJson, HttpError } from "../_shared/http.ts";
import { authed, profileFor } from "../_shared/auth.ts";
import { db } from "../_shared/db.ts";
import { createBill } from "../_shared/toyyibpay.ts";
import { parseCart, priceCart, fmt, MIN_TOTAL_SEN, type Body } from "../_shared/pricing.ts";

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

  const qty = parseCart(body);

  // 2. Basic abuse limit: max 5 unpaid orders per hour
  const since = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await db.from("orders").select("id", { count: "exact", head: true })
    .eq("user_id", profile.id).eq("status", "pending_payment").gte("created_at", since);
  if ((count ?? 0) >= 5) throw new HttpError(429, "too_many_pending_orders");

  await db.rpc("release_expired_reservations");

  const { lines, subtotal, discount, couponId, total } = await priceCart(profile.id, body, qty);
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
    await db.from("notifications").insert({ user_id: profile.id, title: "Order placed", body: `Order ${order.order_number} is waiting for payment.` });
    return { order_id: order.id, order_number: order.order_number, payment_url: bill.url };
  } catch (e) {
    await abort(order.id);
    throw e;
  }
});
