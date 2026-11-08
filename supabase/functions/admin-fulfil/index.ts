// Admin completes a manual/subscription delivery and tells the customer. Idempotent per delivery.
import { serve, readJson, HttpError } from "../_shared/http.ts";
import { requireAdmin, audit } from "../_shared/auth.ts";
import { db } from "../_shared/db.ts";
import { sendEmail, template } from "../_shared/email.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  const me = await requireAdmin(req);
  const { delivery_id, note } = await readJson<{ delivery_id?: string; note?: string }>(req, 10_000);
  if (!UUID.test(String(delivery_id))) throw new HttpError(400, "invalid_delivery");
  const text = String(note ?? "").trim().slice(0, 2000);
  if (!text) throw new HttpError(400, "note_required");

  const { data: d } = await db.from("deliveries").select("id,order_id,user_id,kind,status").eq("id", delivery_id).maybeSingle();
  if (!d || d.kind === "license_key") throw new HttpError(404, "not_found");
  const { data: order } = await db.from("orders").select("id,order_number,email,status").eq("id", d.order_id).single();
  if (!order || !["paid", "processing"].includes(order.status)) throw new HttpError(409, "order_not_payable_state");   // never fulfil unpaid orders

  const { data: done } = await db.from("deliveries").update({ status: "delivered", note: text, delivered_at: new Date().toISOString() })
    .eq("id", d.id).eq("status", "pending").select("id");
  if (!done?.length) return { ok: true, already: true };
  await audit(me.uid, "fulfil_delivery", "delivery", d.id, { order_id: d.order_id });

  const { count: open } = await db.from("deliveries").select("id", { count: "exact", head: true }).eq("order_id", d.order_id).eq("status", "pending");
  const { count: items } = await db.from("order_items").select("id", { count: "exact", head: true }).eq("order_id", d.order_id);
  const { count: made } = await db.from("deliveries").select("id", { count: "exact", head: true }).eq("order_id", d.order_id);
  if ((open ?? 1) > 0 || (made ?? 0) < (items ?? 1)) return { ok: true, order_complete: false };

  const { data: moved } = await db.from("orders").update({ status: "delivered" }).eq("id", d.order_id).in("status", ["paid", "processing"]).select("id");
  if (moved?.length) {
    await db.from("order_events").insert({ order_id: d.order_id, status: "delivered", message: "Your order has been delivered.", actor_id: me.uid });
    await db.from("notifications").insert({ user_id: d.user_id, title: "Order delivered", body: `Order ${order.order_number} is ready. Open it to see your delivery details.` });
    await sendEmail(order.email, `Your BuyDigital order ${order.order_number} is ready`,
      template("Your order is ready", `Order ${order.order_number} has been delivered. Open it to see your delivery details.`, `${Deno.env.get("SITE_URL")}/account/orders/${d.order_id}`));
  }
  return { ok: true, order_complete: true };
});
