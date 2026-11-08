import { db } from "./db.ts";
import { sendEmail, template } from "./email.ts";

// Safe to call repeatedly (webhook retries): codes move once, status changes are guarded by the
// expected previous status, and notifications/emails only fire when a status change really happened.
export async function fulfilOrder(orderId: string) {
  const { error } = await db.rpc("fulfil_license_items", { p_order: orderId });
  if (error) throw error;

  const { data: order } = await db.from("orders").select("id,order_number,user_id,email,status").eq("id", orderId).single();
  if (!order) return;
  const { data: items } = await db.from("order_items").select("id,products!inner(delivery_method)").eq("order_id", orderId);
  const { data: dels } = await db.from("deliveries").select("order_item_id,status").eq("order_id", orderId);

  // Items needing a person (manual / subscription / file) get one pending delivery row for the admin queue.
  const manual = (items ?? []).filter((i: any) => i.products.delivery_method !== "license_key");
  for (const i of manual) {
    if (!dels?.some((d) => d.order_item_id === i.id)) {
      await db.from("deliveries").insert({ order_id: orderId, order_item_id: i.id, user_id: order.user_id, kind: (i as any).products.delivery_method, status: "pending" });
    }
  }
  const allKeys = (items ?? []).length > 0 && manual.length === 0 &&
    (items ?? []).every((i) => dels?.some((d) => d.order_item_id === i.id && d.status === "delivered"));
  const next = allKeys ? "delivered" : "processing";
  const message = next === "delivered" ? "Your digital items are ready." : "Payment confirmed. We are preparing your order.";

  const { data: moved } = await db.from("orders").update({ status: next }).eq("id", orderId)
    .in("status", next === "delivered" ? ["paid", "processing"] : ["paid"]).select("id");
  if (!moved?.length) return;

  await db.from("order_events").insert({ order_id: orderId, status: next, message });
  await db.from("notifications").insert({ user_id: order.user_id, title: next === "delivered" ? "Order delivered" : "Payment received", body: `Order ${order.order_number}: ${message}` });
  await sendEmail(order.email, `BuyDigital order ${order.order_number}`,
    template(next === "delivered" ? "Your order is ready" : "Payment received", `Order ${order.order_number}: ${message}`,
      `${Deno.env.get("SITE_URL")}/account/orders/${orderId}`));
}
