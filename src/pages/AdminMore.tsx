import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { callFn } from "../lib/supabase";
import { useFetch } from "../lib/useFetch";
import { rm } from "../lib/format";
import { db, Err, H, inp, Table, when } from "./Admin";

function Bars({ data, money = false, title }: { data: { label: string; value: number }[]; money?: boolean; title: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure className="card p-4"><figcaption className="mb-3 text-sm font-semibold">{title}</figcaption>
      {data.length === 0 || data.every((d) => d.value === 0) ? <p className="py-8 text-center text-sm text-mute">No data yet.</p> :
        <svg viewBox={`0 0 ${Math.max(data.length * 22, 220)} 120`} className="h-36 w-full" role="img" aria-label={title} preserveAspectRatio="none">
          {data.map((d, i) => { const h = (d.value / max) * 100; return <g key={d.label}><title>{`${d.label}: ${money ? rm(d.value) : d.value}`}</title><rect x={i * 22 + 3} y={110 - h} width="16" height={Math.max(h, d.value ? 1 : 0)} rx="3" fill="#E62117" /></g>; })}
        </svg>}
      {data.length > 0 && <p className="mt-1 flex justify-between text-[11px] text-mute"><span>{data[0].label}</span><span>{data[data.length - 1].label}</span></p>}
    </figure>
  );
}
function Ranked({ rows, title, money }: { rows: [string, number][]; title: string; money?: boolean }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return <div className="card p-4"><p className="mb-3 text-sm font-semibold">{title}</p>{rows.length === 0 ? <p className="py-6 text-center text-sm text-mute">No data yet.</p> :
    <ul className="space-y-2">{rows.map(([n, v]) => <li key={n} className="text-sm"><div className="flex justify-between"><span className="truncate pr-2">{n}</span><span>{money ? rm(v) : v}</span></div><div className="mt-1 h-1.5 rounded-full bg-soft"><div className="h-1.5 rounded-full bg-brand" style={{ width: `${(v / max) * 100}%` }} /></div></li>)}</ul>}</div>;
}
const day = (s: string) => s.slice(0, 10);
const lastDays = (n: number) => Array.from({ length: n }, (_, i) => day(new Date(Date.now() - (n - 1 - i) * 864e5).toISOString()));

export function Dashboard() {
  const { data, error } = useFetch(async () => {
    const since = new Date(Date.now() - 90 * 864e5).toISOString();
    const [pay, ord, items, vars, inv, cust, prod] = await Promise.all([
      db().from("payments").select("amount,created_at").eq("status", "succeeded").gte("created_at", since).limit(5000),
      db().from("orders").select("status,created_at").gte("created_at", since).limit(5000),
      db().from("order_items").select("product_name,quantity,line_total,products(categories(name)),orders!inner(status)").in("orders.status", ["paid", "processing", "delivered", "completed"]).limit(5000),
      db().from("product_variants").select("id,label,low_stock_threshold,products!inner(name,delivery_method)").eq("products.delivery_method", "license_key").eq("is_active", true),
      db().from("inventory_overview").select("variant_id,status"), db().from("profiles").select("id", { count: "exact", head: true }),
      db().from("products").select("id", { count: "exact", head: true }).eq("is_active", true).is("archived_at", null)]);
    const all = await db().from("payments").select("amount").eq("status", "succeeded").limit(100000);
    return { pay: pay.data ?? [], ord: ord.data ?? [], items: items.data ?? [], vars: vars.data ?? [], inv: inv.data ?? [], customers: cust.count ?? 0, products: prod.count ?? 0, revenue: (all.data ?? []).reduce((a: number, p: any) => a + Number(p.amount), 0) };
  }, []);
  if (!data) return <div><H>Dashboard</H><Err e={error} /></div>;
  const days = lastDays(30);
  const rev = days.map((d) => ({ label: d.slice(5), value: data.pay.filter((p: any) => day(p.created_at) === d).reduce((a: number, p: any) => a + Number(p.amount), 0) }));
  const ords = days.map((d) => ({ label: d.slice(5), value: data.ord.filter((o: any) => day(o.created_at) === d).length }));
  const sum = (key: (i: any) => string, val: (i: any) => number) => { const m = new Map<string, number>(); data.items.forEach((i: any) => m.set(key(i), (m.get(key(i)) ?? 0) + val(i))); return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6); };
  const best = sum((i) => i.product_name, (i) => i.quantity), byCat = sum((i) => i.products?.categories?.name ?? "Uncategorised", (i) => Number(i.line_total));
  const avail = (v: string) => data.inv.filter((i: any) => i.variant_id === v && i.status === "available").length;
  const low = data.vars.filter((v: any) => avail(v.id) <= v.low_stock_threshold);
  const stat = (t: string, v: string | number) => <div className="card p-4"><p className="text-sm text-mute">{t}</p><p className="mt-1 text-2xl font-bold">{v}</p></div>;
  const pending = data.ord.filter((o: any) => ["paid", "processing"].includes(o.status)).length;
  return (
    <div><H>Dashboard</H><Err e={error} /><p className="mt-1 text-sm text-mute">Revenue counts verified, non-refunded payments only.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{stat("Revenue (all time)", rm(data.revenue))}{stat("Orders (90 days)", data.ord.length)}{stat("Awaiting fulfilment", pending)}
        {stat("Completed (90 days)", data.ord.filter((o: any) => ["delivered", "completed"].includes(o.status)).length)}{stat("Customers", data.customers)}{stat("Active products", data.products)}</div>
      {low.length > 0 && <div className="card mt-5 border-brand/40 p-4 text-sm"><p className="font-semibold text-brand">Low stock</p><ul className="mt-2 space-y-1">{low.map((v: any) => <li key={v.id}>{v.products.name} · {v.label}: {avail(v.id)} codes left</li>)}</ul></div>}
      <div className="mt-6 grid gap-4 lg:grid-cols-2"><Bars title="Revenue, last 30 days" data={rev} money /><Bars title="Orders, last 30 days" data={ords} /><Ranked title="Best-selling products (units)" rows={best} /><Ranked title="Sales by category" rows={byCat} money /></div></div>
  );
}

export function AdminCustomers() {
  const { data, reload, error } = useFetch(async () => {
    const [p, o] = await Promise.all([db().from("profiles").select("*").order("created_at", { ascending: false }).limit(500), db().from("orders").select("id,user_id,order_number,total,status,created_at").order("created_at", { ascending: false }).limit(5000)]);
    return { p: p.data ?? [], o: o.data ?? [] };
  }, []);
  const [q, setQ] = useState(""), [open, setOpen] = useState<string | null>(null);
  const toggle = async (u: any) => { const next = u.status === "active" ? "suspended" : "active"; if (!confirm(`${next === "suspended" ? "Suspend" : "Reactivate"} ${u.email}?`)) return; await db().from("profiles").update({ status: next }).eq("id", u.id); reload(); };
  const rows = (data?.p ?? []).filter((u: any) => !q || `${u.email} ${u.full_name ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div><H>Customers</H><Err e={error} /><input className={`${inp} mt-4 w-72`} placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
      <Table head={["Customer", "Joined", "Orders", "Status", ""]} rows={rows.map((u: any) => { const mine = (data?.o ?? []).filter((o: any) => o.user_id === u.id); return [
        <span key="a"><b>{u.full_name || "—"}</b><br /><span className="text-xs text-mute">{u.email}</span>{open === u.id && <ul className="mt-2 space-y-1 text-xs">{mine.map((o: any) => <li key={o.id}><Link className="text-brand" to={`/admin/orders/${o.id}`}>{o.order_number}</Link> · {rm(Number(o.total))} · {o.status.replace(/_/g, " ")}</li>)}{!mine.length && <li className="text-mute">No orders.</li>}</ul>}</span>,
        when(u.created_at), <button key="o" className="text-brand" onClick={() => setOpen(open === u.id ? null : u.id)}>{mine.length}</button>, u.status, <button key="t" className="text-brand" onClick={() => toggle(u)}>{u.status === "active" ? "Suspend" : "Reactivate"}</button>]; })} /></div>
  );
}

export function AdminOrderDetail() {
  const { id = "" } = useParams();
  const { data, reload, error } = useFetch(async () => {
    const [o, it, pay, ev, del] = await Promise.all([db().from("orders").select("*,profiles(email,full_name)").eq("id", id).maybeSingle(), db().from("order_items").select("*").eq("order_id", id),
      db().from("payments").select("*").eq("order_id", id), db().from("order_events").select("*").eq("order_id", id).order("created_at"), db().from("deliveries").select("*").eq("order_id", id)]);
    return { o: o.data, it: it.data ?? [], pay: pay.data ?? [], ev: ev.data ?? [], del: del.data ?? [] };
  }, [id]);
  const [reason, setReason] = useState(""), [msg, setMsg] = useState("");
  if (!data) return <Err e={error} />;
  if (!data.o) return <p className="text-brand">Order not found.</p>;
  const o: any = data.o;
  const act = async (action: "cancel" | "refund") => {
    if (!confirm(action === "refund" ? "Record a refund? Return the money in ToyyibPay / your bank too. The customer loses access to this order's goods." : "Cancel this unpaid order?")) return;
    try { await callFn("admin-order-action", { order_id: id, action, reason }); setReason(""); setMsg("Done."); reload(); } catch (x) { setMsg(`Failed: ${(x as Error).message}`); }
  };
  const fulfil = async (e: FormEvent<HTMLFormElement>, did: string) => { e.preventDefault(); try { await callFn("admin-fulfil", { delivery_id: did, note: String(new FormData(e.currentTarget).get("n")) }); setMsg("Delivered."); reload(); } catch (x) { setMsg(`Failed: ${(x as Error).message}`); } };
  const canCancel = ["pending_payment", "payment_processing", "failed"].includes(o.status), canRefund = ["paid", "processing", "delivered", "completed"].includes(o.status);
  return (
    <div className="max-w-3xl"><Link to="/admin/orders" className="text-sm text-brand">← Orders</Link><H>Order {o.order_number}</H>
      <p className="mt-1 text-sm text-mute">{when(o.created_at)} · {o.profiles?.full_name} · {o.email} · <b className="capitalize text-ink">{o.status.replace(/_/g, " ")}</b></p>
      <Table head={["Item", "Qty", "Unit", "Total"]} rows={[...data.it.map((i: any) => [`${i.product_name} · ${i.variant_label}`, i.quantity, rm(Number(i.unit_price)), rm(Number(i.line_total))]), ["Discount", "", "", `− ${rm(Number(o.discount_total))}`], [<b key="t">Total</b>, "", "", <b key="v">{rm(Number(o.total))}</b>]]} />
      <h2 className="mt-6 font-semibold">Payments</h2><Table head={["Provider", "Reference", "Amount", "Status", "Verified"]} rows={data.pay.map((p: any) => [p.provider, p.provider_ref ?? "—", rm(Number(p.amount)), p.status, p.verified_at ? when(p.verified_at) : "—"])} />
      <h2 className="mt-6 font-semibold">Delivery</h2><ul className="mt-2 space-y-2 text-sm">{data.del.map((d: any) => <li key={d.id} className="card p-3">{d.kind.replace("_", " ")} · {d.status}{d.note ? ` · ${d.note}` : ""}
        {d.status === "pending" && <form onSubmit={(e) => fulfil(e, d.id)} className="mt-2 flex gap-2"><input name="n" required className={`${inp} flex-1`} placeholder="Delivery details shown to the customer" aria-label="Delivery details" /><button className="btn btn-primary !py-2">Deliver</button></form>}</li>)}
        {!data.del.length && <li className="text-mute">Nothing to deliver yet.</li>}</ul>
      <h2 className="mt-6 font-semibold">History</h2><ol className="mt-2 space-y-1 border-l border-line pl-4 text-sm">{data.ev.map((e: any) => <li key={e.id}><b className="capitalize">{e.status.replace(/_/g, " ")}</b> <span className="text-mute">{when(e.created_at)}</span>{e.message && <span className="text-mute"> · {e.message}</span>}</li>)}</ol>
      {(canCancel || canRefund) && <div className="card mt-6 p-4"><p className="text-sm font-semibold">Cancel or refund</p><input className={`${inp} mt-2 w-full`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required, shown to the customer)" aria-label="Reason" />
        <div className="mt-3 flex gap-2">{canCancel && <button className="btn btn-ghost" disabled={reason.trim().length < 3} onClick={() => act("cancel")}>Cancel order</button>}{canRefund && <button className="btn btn-ghost" disabled={reason.trim().length < 3} onClick={() => act("refund")}>Record refund</button>}</div></div>}
      <p className="mt-3 text-sm" role="status">{msg}</p></div>
  );
}

export function AdminReviews() {
  const { data, reload, error } = useFetch(async () => (await db().from("product_reviews").select("id,rating,body,status,created_at,products(name)").order("created_at", { ascending: false }).limit(200)).data ?? [], []);
  const set = async (id: string, status: string) => { await db().from("product_reviews").update({ status }).eq("id", id); reload(); };
  return <div><H>Reviews</H><Err e={error} /><p className="mt-1 text-sm text-mute">Only verified buyers can submit reviews. Approve to publish.</p>
    <Table head={["Product", "Rating", "Review", "Status", ""]} rows={(data ?? []).map((r: any) => [r.products?.name, `${r.rating}/5`, r.body ?? "—", r.status,
      <span key="a" className="flex gap-3">{r.status !== "approved" && <button className="text-brand" onClick={() => set(r.id, "approved")}>Approve</button>}{r.status !== "rejected" && <button className="text-mute" onClick={() => set(r.id, "rejected")}>Reject</button>}</span>])} /></div>;
}

export function AdminUsers() {
  const { data, reload, error } = useFetch(async () => {
    const r = await db().from("user_roles").select("user_id,role,created_at").order("created_at"); const ids = (r.data ?? []).map((x: any) => x.user_id);
    const p = ids.length ? await db().from("profiles").select("id,email,full_name").in("id", ids) : { data: [] };
    return (r.data ?? []).map((x: any) => ({ ...x, profile: (p.data ?? []).find((y: any) => y.id === x.user_id) }));
  }, []);
  const [email, setEmail] = useState(""), [role, setRole] = useState("staff"), [msg, setMsg] = useState("");
  const run = async (action: string, em: string, rl: string) => {
    if (action === "revoke" && !confirm(`Remove ${rl} access for ${em}?`)) return;
    try { await callFn("admin-users", { action, email: em, role: rl }); setMsg("Done."); setEmail(""); reload(); } catch (x) { const c = (x as Error).message; setMsg(c === "user_not_found" ? "That person must register first." : c === "last_admin" ? "You cannot remove the last admin." : c === "forbidden" ? "Only full admins can manage users." : "Failed."); }
  };
  return (
    <div><H>Admin Users</H><Err e={error} /><p className="mt-1 text-sm text-mute">Admins manage users and everything else. Staff can work orders, products, support and inventory. Roles are stored in the database and checked on the server.</p>
      <form onSubmit={(e) => { e.preventDefault(); run("grant", email.trim(), role); }} className="card mt-4 flex max-w-xl flex-wrap gap-3 p-4"><input type="email" required className={`${inp} flex-1`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Registered email" aria-label="Email" />
        <select className={inp} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role"><option value="staff">Staff</option><option value="admin">Admin</option></select><button className="btn btn-primary">Grant access</button></form>
      <p className="mt-2 text-sm" role="status">{msg}</p>
      <Table head={["User", "Role", "Since", ""]} rows={(data ?? []).map((r: any) => [<span key="a">{r.profile?.full_name || "—"}<br /><span className="text-xs text-mute">{r.profile?.email}</span></span>, r.role, when(r.created_at), <button key="b" className="text-brand" onClick={() => run("revoke", r.profile?.email ?? "", r.role)}>Remove</button>])} /></div>
  );
}

const fields: [string, string, boolean][] = [["store_name", "Store name", false], ["support_email", "Support email", false], ["support_phone", "Support phone", false], ["whatsapp", "WhatsApp number (digits)", false], ["facebook", "Facebook URL", false], ["instagram", "Instagram URL", false],
  ["tiktok", "TikTok URL", false], ["youtube", "YouTube URL", false], ["announcement", "Top-of-site announcement (leave empty to hide)", false], ["page_about", "About page", true], ["page_faq", "FAQ / How it works", true],
  ["page_privacy", "Privacy Policy", true], ["page_terms", "Terms & Conditions", true], ["page_refund", "Refund Policy", true], ["page_delivery", "Shipping & Delivery", true]];
export function AdminSettings() {
  const { data, error, reload } = useFetch(async () => Object.fromEntries(((await db().from("website_settings").select("key,value")).data ?? []).map((r: any) => [r.key, typeof r.value === "string" ? r.value : ""])), []);
  const [edit, setEdit] = useState<Record<string, string>>({}), [msg, setMsg] = useState("");
  const save = async (e: FormEvent) => {
    e.preventDefault(); const rows = Object.entries(edit).map(([key, value]) => ({ key, value, is_public: true, updated_at: new Date().toISOString() }));
    const r = rows.length ? await db().from("website_settings").upsert(rows, { onConflict: "key" }) : { error: null };
    setMsg(r.error ? "Could not save." : "Saved. Visitors see changes on their next page load."); if (!r.error) { setEdit({}); reload(); }
  };
  return (
    <form onSubmit={save} className="max-w-2xl"><H>Website Settings</H><Err e={error} /><p className="mt-1 text-sm text-mute">Contact details, social links and page text. Have a lawyer review the policy pages before launch.</p>
      <div className="mt-5 space-y-4">{fields.map(([k, label, long]) => <label key={k} className="block text-sm font-medium">{label}
        {long ? <textarea rows={6} className={`${inp} mt-1 w-full`} value={edit[k] ?? data?.[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /> : <input className={`${inp} mt-1 w-full`} value={edit[k] ?? data?.[k] ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />}</label>)}</div>
      <button className="btn btn-primary mt-6">Save settings</button> <span className="ml-3 text-sm" role="status">{msg}</span></form>
  );
}

export function AdminNotifications() {
  const [title, setTitle] = useState(""), [body, setBody] = useState(""), [email, setEmail] = useState(""), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const send = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return; if (!email.trim() && !confirm("Send this to ALL active customers?")) return; setBusy(true);
    try { const r = await callFn<{ recipients: number }>("admin-notify", { title, body, email: email.trim() || undefined }); setMsg(`Sent to ${r.recipients} customer(s).`); setTitle(""); setBody(""); } catch (x) { setMsg((x as Error).message === "no_recipients" ? "No matching customer." : "Failed."); }
    setBusy(false);
  };
  return (
    <form onSubmit={send} className="max-w-xl"><H>Notifications</H><p className="mt-1 text-sm text-mute">Send an in-app message to one customer, or leave the email empty to message everyone. Order and payment emails are sent automatically.</p>
      <label className="mt-5 block text-sm font-medium">Customer email (optional)<input type="email" className={`${inp} mt-1 w-full`} value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="mt-4 block text-sm font-medium">Title<input required maxLength={120} className={`${inp} mt-1 w-full`} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="mt-4 block text-sm font-medium">Message<textarea rows={4} maxLength={1000} className={`${inp} mt-1 w-full`} value={body} onChange={(e) => setBody(e.target.value)} /></label>
      <button className="btn btn-primary mt-5" disabled={busy}>Send</button> <span className="ml-3 text-sm" role="status">{msg}</span></form>
  );
}
