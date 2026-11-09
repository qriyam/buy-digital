import { useState, type FormEvent, type ReactNode } from "react";
import { Link, NavLink, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { callFn, live, supabase } from "../lib/supabase";
import { useFetch } from "../lib/useFetch";
import { rm } from "../lib/format";

export const db = () => supabase!;
export const when = (s: string) => new Date(s).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
export const inp = "rounded-xl border border-line px-3 py-2 text-sm";
export const Err = ({ e }: { e: string | null }) => e ? <p role="alert" className="text-sm text-brand">{e}</p> : null;
export const H = ({ children }: { children: ReactNode }) => <h1 className="text-2xl font-bold tracking-tight">{children}</h1>;
export const Table = ({ head, rows }: { head: string[]; rows: ReactNode[][] }) => (
  <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="text-mute"><tr>{head.map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead>
    <tbody className="divide-y divide-line">{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="py-2.5 pr-3 align-top">{c}</td>)}</tr>)}</tbody></table></div>);

export function AdminLayout() {
  const { user, loading, isAdmin, signOut } = useAuth();
  if (!live) return <p className="py-24 text-center text-mute">The admin panel needs the backend.</p>;
  if (loading) return <p className="py-24 text-center text-mute">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <div className="py-24 text-center"><h1 className="text-2xl font-bold">Not authorised</h1><p className="mt-2 text-mute">This area is for store administrators.</p></div>;
  const l = ({ isActive }: { isActive: boolean }) => `block rounded-lg px-3 py-2 text-sm ${isActive ? "bg-brand/10 font-semibold text-brand" : "hover:bg-soft"}`;
  const nav = [["", "Dashboard"], ["products", "Products"], ["categories", "Categories"], ["orders", "Orders"], ["customers", "Customers"], ["inventory", "Digital Inventory"], ["payments", "Payments"], ["coupons", "Coupons"], ["support", "Support Tickets"], ["reviews", "Reviews"], ["notifications", "Notifications"], ["settings", "Website Settings"], ["users", "Admin Users"], ["audit-logs", "Audit Logs"]];
  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[210px_1fr]">
      <nav aria-label="Admin" className="flex gap-1 overflow-x-auto md:flex-col">
        {nav.map(([to, t]) => <NavLink key={to} to={`/admin/${to}`} end={to === ""} className={l}>{t}</NavLink>)}
        <button onClick={signOut} className="rounded-lg px-3 py-2 text-left text-sm hover:bg-soft">Logout</button></nav>
      <section className="min-w-0"><Outlet /></section>
    </div>
  );
}

export function AdminOrders() {
  const [q, setQ] = useState(""), [status, setStatus] = useState(""), [msg, setMsg] = useState("");
  const { data, reload, error } = useFetch(async () => {
    let r = db().from("orders").select("id,order_number,email,total,status,created_at,order_items(product_name,variant_label),deliveries(id,kind,status,order_item_id)").order("created_at", { ascending: false }).limit(100);
    if (status) r = r.eq("status", status);
    if (q.trim()) r = r.or(`email.ilike.%${q.trim().replace(/[%,]/g, "")}%,order_number.ilike.%${q.trim().replace(/[%,]/g, "")}%`);
    return (await r).data ?? [];
  }, [q, status]);
  const fulfil = async (e: FormEvent<HTMLFormElement>, id: string) => {
    e.preventDefault(); const note = String(new FormData(e.currentTarget).get("n") ?? "");
    try { await callFn("admin-fulfil", { delivery_id: id, note }); setMsg("Delivered."); reload(); } catch (x) { setMsg(`Failed: ${(x as Error).message}`); }
  };
  return (
    <div><H>Orders</H><Err e={error} />
      <div className="mt-4 flex flex-wrap gap-3"><input className={`${inp} w-64`} placeholder="Order number or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" />
        <select className={inp} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status"><option value="">All statuses</option>{["pending_payment", "payment_processing", "paid", "processing", "delivered", "completed", "cancelled", "refunded", "failed"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></div>
      <p className="mt-2 text-sm text-mute" role="status">{msg}</p>
      <Table head={["Order", "Customer", "Items", "Total", "Status", "Fulfil"]} rows={(data ?? []).map((o: any) => [
        <span key="a"><Link className="font-semibold text-brand" to={`/admin/orders/${o.id}`}>{o.order_number}</Link><br /><span className="text-xs text-mute">{when(o.created_at)}</span></span>, o.email,
        o.order_items.map((i: any) => `${i.product_name} (${i.variant_label})`).join(", "), rm(Number(o.total)), o.status.replace(/_/g, " "),
        <div key="f">{o.deliveries.filter((d: any) => d.status === "pending").map((d: any) => (
          <form key={d.id} onSubmit={(e) => fulfil(e, d.id)} className="flex gap-1"><input name="n" required placeholder="Delivery details" className={`${inp} w-44`} aria-label="Delivery details" /><button className="btn btn-primary !px-3 !py-2">Deliver</button></form>))}</div>])} /></div>
  );
}

export function AdminInventory() {
  const vars = useFetch(async () => (await db().from("product_variants").select("id,label,products!inner(name,delivery_method)").eq("products.delivery_method", "license_key")).data ?? [], []);
  const inv = useFetch(async () => (await db().from("inventory_overview").select("variant_id,status")).data ?? [], []);
  const [variant, setVariant] = useState(""), [codes, setCodes] = useState(""), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const count = (v: string, s: string) => (inv.data ?? []).filter((i: any) => i.variant_id === v && i.status === s).length;
  const upload = async (e: FormEvent) => {
    e.preventDefault(); if (busy || !variant) return; setBusy(true);
    try { const r = await callFn<{ added: number; duplicates: number }>("admin-add-inventory", { variant_id: variant, codes: codes.split(/\r?\n/) }); setMsg(`Added ${r.added}, skipped ${r.duplicates} duplicates.`); setCodes(""); inv.reload(); }
    catch (x) { setMsg(`Failed: ${(x as Error).message}`); } setBusy(false);
  };
  return (
    <div><H>Digital Inventory</H><p className="mt-1 text-sm text-mute">Codes are encrypted before storage and are never shown again here.</p>
      <Table head={["Variant", "Available", "Reserved", "Used"]} rows={(vars.data ?? []).map((v: any) => [`${v.products.name} · ${v.label}`, count(v.id, "available"), count(v.id, "reserved"), count(v.id, "used")])} />
      <form onSubmit={upload} className="card mt-6 max-w-lg p-4"><label className="text-sm font-medium">Variant<select required className={`${inp} mt-1 w-full`} value={variant} onChange={(e) => setVariant(e.target.value)}><option value="">Select…</option>{(vars.data ?? []).map((v: any) => <option key={v.id} value={v.id}>{v.products.name} · {v.label}</option>)}</select></label>
        <label className="mt-3 block text-sm font-medium">Codes (one per line, up to 500)<textarea required rows={6} className={`${inp} mt-1 w-full font-mono`} value={codes} onChange={(e) => setCodes(e.target.value)} /></label>
        <button className="btn btn-primary mt-4" disabled={busy}>Upload codes</button> <span className="ml-2 text-sm" role="status">{msg}</span></form></div>
  );
}

export function AdminCoupons() {
  const { data, reload, error } = useFetch(async () => (await db().from("coupons").select("*").order("created_at", { ascending: false })).data ?? [], []);
  const [msg, setMsg] = useState("");
  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = new FormData(e.currentTarget); const g = (k: string) => String(f.get(k) ?? "").trim();
    const { error } = await db().from("coupons").insert({ code: g("code"), discount_type: g("type"), discount_value: g("value"), min_order: g("min") || 0, max_discount: g("max") || null, expires_at: g("exp") || null, usage_limit: g("limit") || null });
    setMsg(error ? "Could not create (duplicate code or invalid values)." : "Created."); if (!error) { e.currentTarget.reset(); reload(); }
  };
  const toggle = async (id: string, on: boolean) => { await db().from("coupons").update({ is_active: on }).eq("id", id); reload(); };
  return (
    <div><H>Coupons</H><Err e={error} />
      <form onSubmit={create} className="card mt-5 grid max-w-2xl gap-3 p-4 sm:grid-cols-3">
        <input name="code" required placeholder="CODE" className={inp} aria-label="Code" /><select name="type" className={inp} aria-label="Type"><option value="percentage">Percent</option><option value="fixed">Fixed RM</option></select>
        <input name="value" required type="number" step="0.01" min="0.01" placeholder="Value" className={inp} aria-label="Value" /><input name="min" type="number" step="0.01" placeholder="Min order RM" className={inp} aria-label="Minimum order" />
        <input name="max" type="number" step="0.01" placeholder="Max discount RM" className={inp} aria-label="Maximum discount" /><input name="limit" type="number" placeholder="Usage limit" className={inp} aria-label="Usage limit" />
        <input name="exp" type="datetime-local" className={inp} aria-label="Expires" /><button className="btn btn-primary">Create</button><span className="text-sm" role="status">{msg}</span></form>
      <Table head={["Code", "Discount", "Min", "Expires", "Active"]} rows={(data ?? []).map((c: any) => [c.code, c.discount_type === "percentage" ? `${c.discount_value}%` : rm(Number(c.discount_value)), rm(Number(c.min_order)), c.expires_at ? when(c.expires_at) : "Never",
        <input key="t" type="checkbox" checked={c.is_active} onChange={(e) => toggle(c.id, e.target.checked)} aria-label={`Toggle ${c.code}`} />])} /></div>
  );
}

export function AdminSupport() {
  const { user } = useAuth();
  const { data, reload, error } = useFetch(async () => (await db().from("support_tickets").select("*,profiles(email),support_messages(id,body,is_staff,created_at)").order("created_at", { ascending: false })).data ?? [], []);
  const set = async (id: string, patch: object) => { await db().from("support_tickets").update(patch).eq("id", id); reload(); };
  const reply = async (e: FormEvent<HTMLFormElement>, id: string) => { e.preventDefault(); const body = String(new FormData(e.currentTarget).get("b") ?? "").trim(); if (!body) return; await db().from("support_messages").insert({ ticket_id: id, author_id: user!.id, is_staff: true, body }); await set(id, { status: "waiting_customer" }); e.currentTarget.reset(); };
  return (
    <div><H>Support Tickets</H><Err e={error} />
      <div className="mt-5 space-y-4">{(data ?? []).map((t: any) => (
        <div key={t.id} className="card p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{t.subject} <span className="font-normal text-mute">· {t.profiles?.email}</span></p>
          <span className="flex gap-2"><select value={t.status} onChange={(e) => set(t.id, { status: e.target.value })} className={inp} aria-label="Status">{["open", "in_progress", "waiting_customer", "resolved", "closed"].map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select>
            <select value={t.priority} onChange={(e) => set(t.id, { priority: e.target.value })} className={inp} aria-label="Priority">{["low", "normal", "high", "urgent"].map((s) => <option key={s}>{s}</option>)}</select></span></div>
          <div className="mt-3 space-y-1">{[...t.support_messages].sort((a: any, b: any) => a.created_at.localeCompare(b.created_at)).map((m: any) => <p key={m.id}><b>{m.is_staff ? "Support" : "Customer"}:</b> {m.body}</p>)}</div>
          <form onSubmit={(e) => reply(e, t.id)} className="mt-3 flex gap-2"><input name="b" required className={`${inp} flex-1`} aria-label="Reply" /><button className="btn btn-primary !py-2">Reply</button></form></div>))}</div></div>
  );
}

function Simple({ title, table, cols, order }: { title: string; table: string; cols: string[]; order: string }) {
  const { data, error } = useFetch(async () => (await db().from(table).select(cols.join(",")).order(order, { ascending: false }).limit(200)).data ?? [], [table]);
  return <div><H>{title}</H><Err e={error} /><Table head={cols} rows={(data ?? []).map((r: any) => cols.map((c) => { const v = r[c]; return v && typeof v === "object" ? JSON.stringify(v) : c.endsWith("_at") && v ? when(v) : String(v ?? ""); }))} /></div>;
}
export const AdminPayments = () => <Simple title="Payments" table="payments" cols={["provider", "provider_ref", "amount", "status", "verified_at", "created_at"]} order="created_at" />;
export const AdminAudit = () => <Simple title="Audit Logs" table="admin_audit_logs" cols={["action", "entity", "entity_id", "details", "created_at"]} order="created_at" />;
