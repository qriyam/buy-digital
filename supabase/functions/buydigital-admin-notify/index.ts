// Send an in-app announcement to one customer (by email) or to every active customer.
import { serve, readJson, HttpError } from "../_shared/http.ts";
import { requireAdmin, audit } from "../_shared/auth.ts";
import { db } from "../_shared/db.ts";

serve(async (req) => {
  const me = await requireAdmin(req);
  const b = await readJson<{ title?: string; body?: string; email?: string }>(req, 5000);
  const title = String(b.title ?? "").trim().slice(0, 120), body = String(b.body ?? "").trim().slice(0, 1000);
  if (!title) throw new HttpError(400, "title_required");
  let q = db.from("profiles").select("id").eq("status", "active");
  if (b.email?.trim()) q = q.ilike("email", b.email.trim().replace(/[_%]/g, "\\$&"));
  const { data } = await q.limit(5000);
  if (!data?.length) throw new HttpError(404, "no_recipients");
  for (let i = 0; i < data.length; i += 500) await db.from("notifications").insert(data.slice(i, i + 500).map((u) => ({ user_id: u.id, title, body })));
  await audit(me.uid, "send_notification", "notification", "-", { title, recipients: data.length });
  return { ok: true, recipients: data.length };
});
