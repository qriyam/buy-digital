import { db } from "./db.ts";
import { HttpError } from "./http.ts";

export type Me = { uid: string; email: string; emailVerified: boolean };

// Verifies the Supabase Auth access token with Supabase itself. Nothing in the token body is trusted locally.
export async function authed(req: Request): Promise<Me> {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "login_required");
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "login_required");
  return { uid: data.user.id, email: data.user.email ?? "", emailVerified: !!data.user.email_confirmed_at };
}

export async function profileFor(uid: string) {
  const read = () => db.from("profiles").select("id,email,full_name,phone,status").eq("id", uid).maybeSingle();
  let { data } = await read();
  if (!data) {   // the browser normally creates it via ensure_profile(); this covers any gap
    const u = await db.auth.admin.getUserById(uid);
    if (!u.data.user) throw new HttpError(403, "no_profile");
    await db.from("profiles").upsert({ id: uid, email: u.data.user.email ?? "", full_name: u.data.user.user_metadata?.full_name ?? null }, { onConflict: "id", ignoreDuplicates: true });
    data = (await read()).data;
    if (!data) throw new HttpError(403, "no_profile");
  }
  if (data.status !== "active") throw new HttpError(403, "account_suspended");
  return data as { id: string; email: string; full_name: string | null; phone: string | null; status: string };
}

// Admin = a row in user_roles, checked server-side with the service role.
export async function requireAdmin(req: Request): Promise<Me> {
  const me = await authed(req);
  const { data } = await db.from("user_roles").select("role").eq("user_id", me.uid).in("role", ["admin", "staff"]).limit(1);
  if (!data?.length) throw new HttpError(403, "forbidden");
  return me;
}

export const audit = (actor: string | null, action: string, entity: string, id: string, details: unknown = {}) =>
  db.from("admin_audit_logs").insert({ actor_id: actor, action, entity, entity_id: id, details });
