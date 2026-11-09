// Returns a purchased code to the customer who owns it. Codes are never exposed by any table or view.
import { serve, readJson, HttpError } from "../_shared/http.ts";
import { authed, profileFor, audit } from "../_shared/auth.ts";
import { db } from "../_shared/db.ts";
import { decryptCode } from "../_shared/crypto.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  const me = await authed(req);
  const profile = await profileFor(me.uid);
  const { delivery_id } = await readJson<{ delivery_id?: string }>(req, 2000);
  if (!UUID.test(String(delivery_id))) throw new HttpError(400, "invalid_delivery");

  const since = new Date(Date.now() - 60_000).toISOString();   // rate limit: 20 reveals / minute / user
  const { count: recent } = await db.from("admin_audit_logs").select("id", { count: "exact", head: true }).eq("actor_id", profile.id).eq("action", "reveal_delivery").gte("created_at", since);
  if ((recent ?? 0) >= 20) throw new HttpError(429, "slow_down");

  const { data: d } = await db.from("deliveries")
    .select("id,kind,status,inventory_item_id,order_id,orders!inner(status)")
    .eq("id", delivery_id).eq("user_id", profile.id).maybeSingle();   // ownership enforced here
  if (!d || d.kind !== "license_key" || d.status !== "delivered" || !d.inventory_item_id) throw new HttpError(404, "not_found");
  if (["refunded", "cancelled", "failed"].includes((d as any).orders.status)) throw new HttpError(403, "order_not_active");

  const { data: item } = await db.from("inventory_items").select("code_encrypted").eq("id", d.inventory_item_id).single();
  if (!item) throw new HttpError(404, "not_found");
  await audit(profile.id, "reveal_delivery", "delivery", d.id, { order_id: d.order_id });
  return { code: await decryptCode(item.code_encrypted) };
});
