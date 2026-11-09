// Grant or revoke admin/staff access. Only full admins may do this; the last admin can never be removed.
import { serve, readJson, HttpError } from "../_shared/http.ts";
import { authed, audit } from "../_shared/auth.ts";
import { db } from "../_shared/db.ts";

serve(async (req) => {
  const me = await authed(req);
  const { data: mine } = await db.from("user_roles").select("role").eq("user_id", me.uid).eq("role", "admin");
  if (!mine?.length) throw new HttpError(403, "forbidden");
  const b = await readJson<{ action?: string; email?: string; role?: string }>(req, 2000);
  if (b.role !== "admin" && b.role !== "staff") throw new HttpError(400, "invalid_role");
  const email = String(b.email ?? "").trim().toLowerCase();
  const { data: p } = await db.from("profiles").select("id,email").ilike("email", email.replace(/[_%]/g, "\\$&")).maybeSingle();
  if (!p) throw new HttpError(404, "user_not_found");   // the person must register first

  if (b.action === "grant") {
    await db.from("user_roles").upsert({ user_id: p.id, role: b.role }, { onConflict: "user_id,role", ignoreDuplicates: true });
  } else if (b.action === "revoke") {
    if (b.role === "admin") {
      const { count } = await db.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin");
      if ((count ?? 0) <= 1) throw new HttpError(409, "last_admin");
    }
    await db.from("user_roles").delete().eq("user_id", p.id).eq("role", b.role);
  } else throw new HttpError(400, "invalid_action");
  await audit(me.uid, `role_${b.action}`, "user", p.id, { role: b.role, email: p.email });
  return { ok: true };
});
