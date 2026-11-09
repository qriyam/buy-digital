// Issues a short-lived signed URL for a purchased file, enforcing owner, order state, expiry and download limit.
import { serve, readJson, HttpError } from "../_shared/http.ts";
import { authed, profileFor, audit } from "../_shared/auth.ts";
import { db } from "../_shared/db.ts";
import { UUID } from "../_shared/pricing.ts";

serve(async (req) => {
  const me = await authed(req);
  const profile = await profileFor(me.uid);
  const { delivery_id } = await readJson<{ delivery_id?: string }>(req, 2000);
  if (!UUID.test(String(delivery_id))) throw new HttpError(400, "invalid_delivery");

  const { data: d } = await db.from("deliveries").select("id,kind,status,file_path,download_limit,download_count,expires_at,order_id,orders!inner(status)")
    .eq("id", delivery_id).eq("user_id", profile.id).maybeSingle();
  if (!d || d.kind !== "file" || d.status !== "delivered" || !d.file_path) throw new HttpError(404, "not_found");
  if (["refunded", "cancelled", "failed"].includes((d as any).orders.status)) throw new HttpError(403, "order_not_active");
  if (d.expires_at && Date.parse(d.expires_at) < Date.now()) throw new HttpError(410, "download_expired");

  // Atomic claim of one download slot (compare-and-set on the current count)
  if (d.download_limit != null && d.download_count >= d.download_limit) throw new HttpError(429, "download_limit_reached");
  const { data: claimed } = await db.from("deliveries").update({ download_count: d.download_count + 1 }).eq("id", d.id).eq("download_count", d.download_count).select("id");
  if (!claimed?.length) throw new HttpError(409, "try_again");

  const { data: signed, error } = await db.storage.from("buydigital-product-files").createSignedUrl(d.file_path, 60);
  if (error || !signed) { await db.from("deliveries").update({ download_count: d.download_count }).eq("id", d.id); throw new HttpError(502, "storage_error"); }
  await audit(profile.id, "download_file", "delivery", d.id, { order_id: d.order_id });
  return { url: signed.signedUrl };
});
