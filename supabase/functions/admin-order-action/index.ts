// Cancel an unpaid order, or record a refund. Every action needs a reason and is audit-logged.
// Refunding money itself is done in ToyyibPay / your bank; this records it and cuts off access to the goods.
import { serve, readJson, HttpError } from "../_shared/http.ts";
import { requireAdmin, audit } from "../_shared/auth.ts";
import { db } from "../_shared/db.ts";
import { UUID } from "../_shared/pricing.ts";
import { sendEmail, template } from "../_shared/email.ts";

serve(async (req) => {
  const me = await requireAdmin(req);
  const b = await readJson<{ order_id?: string; action?: string; reason?: string }>(req, 5000);
  if (!UUID.test(String(b.order_id))) throw new HttpError(400, "invalid_order");
  const reason = String(b.reason ?? "").trim().slice(0, 500);
  if (reason.length < 3) throw new HttpError(400, "reason_required");
  if (b.action !== "cancel" && b.action !== "refund") throw new HttpError(400, "invalid_action");

  const { data: o } = await db.from("orders").select("id,order_number,user_id,email,status").eq("id", b.order_id).maybeSingle();
  if (!o) throw new HttpError(404, "not_found");
  const from = b.action === "cancel" ? ["pending_payment", "payment_processing", "failed"] : ["paid", "processing", "delivered", "completed"];
  const to = b.action === "cancel" ? "cancelled" : "refunded";
  const { data: moved } = await db.from("orders").update({ status: to }).eq("id", o.id).in("status", from).select("id");
  if (!moved?.length) throw new HttpError(409, b.action === "cancel" ? "order_not_cancellable" : "order_not_refundable");

  if (b.action === "cancel") {
    const { data: items } = await db.from("order_items").select("id").eq("order_id", o.id);
    const ids = (items ?? []).map((i) => i.id);
    if (ids.length) await db.from("inventory_items").update({ status: "available", reserved_order_item_id: null, reserved_until: null }).in("reserved_order_item_id", ids).eq("status", "reserved");
    await db.from("payments").update({ status: "cancelled" }).eq("order_id", o.id).in("status", ["pending"]);
    await db.from("coupon_redemptions").delete().eq("order_id", o.id);
  } else {
    await db.from("payments").update({ status: "refunded" }).eq("order_id", o.id).eq("status", "succeeded");
  }
  await db.from("order_events").insert({ order_id: o.id, status: to, message: reason, actor_id: me.uid });
  await db.from("notifications").insert({ user_id: o.user_id, title: to === "refunded" ? "Refund recorded" : "Order cancelled", body: `Order ${o.order_number}: ${reason}` });
  await audit(me.uid, `order_${b.action}`, "order", o.id, { reason, from: o.status });
  await sendEmail(o.email, `BuyDigital order ${o.order_number} ${to}`, template(to === "refunded" ? "Your refund is recorded" : "Your order was cancelled",
    `Order ${o.order_number}: ${reason}`, `${Deno.env.get("SITE_URL")}/account/orders/${o.id}`));
  return { ok: true, status: to };
});
