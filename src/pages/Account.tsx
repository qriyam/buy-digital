import { useState, type FormEvent } from "react";
import { Link, NavLink, Navigate, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { callFn, live, supabase } from "../lib/supabase";
import { useFetch } from "../lib/useFetch";
import { rm } from "../lib/format";

const db = () => supabase!;
const badge = (s: string) => <span className="rounded-full bg-soft px-2.5 py-0.5 text-xs font-medium capitalize">{s.replace(/_/g, " ")}</span>;
const when = (s: string) => new Date(s).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
const Err = ({ e }: { e: string | null }) => e ? <p role="alert" className="text-sm text-brand">Could not load: {e}</p> : null;

export function AccountLayout() {
  const { user, loading, signOut } = useAuth();
  if (!live) return <div className="mx-auto max-w-xl px-4 py-24 text-center text-mute">Accounts need the backend to be connected.</div>;
  if (loading) return <p className="py-24 text-center text-mute">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  const l = ({ isActive }: { isActive: boolean }) => `block rounded-lg px-3 py-2 text-sm ${isActive ? "bg-brand/10 font-semibold text-brand" : "hover:bg-soft"}`;
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[200px_1fr]">
      <nav aria-label="Account" className="flex gap-1 overflow-x-auto md:flex-col">
        {[["/account", "Overview"], ["/account/orders", "My Orders"], ["/account/profile", "My Profile"], ["/account/support", "Support Tickets"], ["/account/notifications", "Notifications"], ["/account/password", "Change Password"]].map(([to, t]) =>
          <NavLink key={to} to={to} end={to === "/account"} className={l}>{t}</NavLink>)}
        <button onClick={signOut} className="rounded-lg px-3 py-2 text-left text-sm hover:bg-soft">Logout</button>
      </nav>
      <section><Outlet /></section>
    </div>
  );
}

export function Overview() {
  const { data, error } = useFetch(async () => (await db().from("orders").select("id,order_number,total,status,created_at").order("created_at", { ascending: false })).data ?? [], []);
  const o = data ?? [];
  const stat = (t: string, n: number) => <div className="card p-4"><p className="text-sm text-mute">{t}</p><p className="mt-1 text-2xl font-bold">{n}</p></div>;
  return (
    <div><h1 className="text-2xl font-bold tracking-tight">Overview</h1><Err e={error} />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{stat("Total orders", o.length)}{stat("Completed", o.filter((x) => ["delivered", "completed"].includes(x.status)).length)}{stat("Pending", o.filter((x) => ["pending_payment", "payment_processing", "paid", "processing"].includes(x.status)).length)}</div>
      <h2 className="mt-8 font-semibold">Recent purchases</h2>
      <ul className="card mt-3 divide-y divide-line">{o.slice(0, 5).map((x) => <li key={x.id}><Link to={`/account/orders/${x.id}`} className="flex justify-between p-4 text-sm hover:bg-soft"><span>{x.order_number}</span><span>{rm(Number(x.total))} {badge(x.status)}</span></Link></li>)}
        {!o.length && <li className="p-4 text-sm text-mute">No orders yet.</li>}</ul></div>
  );
}

export function Orders() {
  const { data, error, loading } = useFetch(async () => (await db().from("orders").select("id,order_number,total,status,created_at,order_items(product_name),payments(status)").order("created_at", { ascending: false })).data ?? [], []);
  return (
    <div><h1 className="text-2xl font-bold tracking-tight">My Orders</h1><Err e={error} />
      {loading ? <p className="mt-6 text-mute">Loading…</p> : !data?.length ? <p className="mt-6 text-mute">No orders yet.</p> :
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="text-mute"><tr><th className="py-2">Order</th><th>Date</th><th>Items</th><th>Amount</th><th>Payment</th><th>Status</th><th /></tr></thead>
          <tbody className="divide-y divide-line">{data.map((o: any) => <tr key={o.id}><td className="py-3 font-medium">{o.order_number}</td><td>{when(o.created_at)}</td><td>{o.order_items.map((i: any) => i.product_name).join(", ")}</td><td>{rm(Number(o.total))}</td><td>{badge(o.payments?.[0]?.status ?? "pending")}</td><td>{badge(o.status)}</td><td><Link className="text-brand" to={`/account/orders/${o.id}`}>View</Link></td></tr>)}</tbody></table></div>}
    </div>
  );
}

function Reveal({ id }: { id: string }) {
  const [code, setCode] = useState<string | null>(null), [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const show = async () => { if (busy) return; setBusy(true); setErr(null); try { setCode((await callFn<{ code: string }>("reveal-delivery", { delivery_id: id })).code); } catch { setErr("Could not load your code. Try again or contact support."); } setBusy(false); };
  return code ? <code className="select-all rounded-lg bg-soft px-3 py-2 text-sm">{code}</code> : <><button className="btn btn-primary !py-2" onClick={show} disabled={busy}>Show code</button>{err && <span role="alert" className="ml-2 text-sm text-brand">{err}</span>}</>;
}

export function OrderDetail() {
  const { id = "" } = useParams();
  const { data, error, loading } = useFetch(async () => {
    const [o, items, ev, del, pay] = await Promise.all([
      db().from("orders").select("*").eq("id", id).maybeSingle(), db().from("order_items").select("*").eq("order_id", id),
      db().from("order_events").select("*").eq("order_id", id).order("created_at"), db().from("deliveries").select("*").eq("order_id", id),
      db().from("payments").select("provider,provider_ref,status").eq("order_id", id)]);
    return { o: o.data, items: items.data ?? [], ev: ev.data ?? [], del: del.data ?? [], pay: pay.data ?? [] };
  }, [id]);
  if (loading) return <p className="text-mute">Loading…</p>;
  if (error || !data?.o) return <div><h1 className="text-2xl font-bold">Order not found</h1><Link to="/account/orders" className="btn btn-ghost mt-4">My orders</Link></div>;
  const { o, items, ev, del, pay } = data;
  return (
    <div><h1 className="text-2xl font-bold tracking-tight">Order {o.order_number}</h1>
      <p className="mt-1 text-sm text-mute">{when(o.created_at)} · {badge(o.status)} · Payment {badge(pay[0]?.status ?? "pending")}{pay[0]?.provider_ref ? ` · Ref ${pay[0].provider_ref}` : ""}</p>
      <h2 className="mt-6 font-semibold">Items</h2>
      <ul className="card mt-2 divide-y divide-line">{items.map((i: any) => <li key={i.id} className="flex justify-between p-4 text-sm"><span>{i.product_name} · {i.variant_label} × {i.quantity}</span><span>{rm(Number(i.line_total))}</span></li>)}
        <li className="flex justify-between p-4 text-sm font-semibold"><span>Total</span><span>{rm(Number(o.total))}</span></li></ul>
      <h2 className="mt-6 font-semibold">Delivery</h2>
      <ul className="card mt-2 divide-y divide-line">{del.length === 0 ? <li className="p-4 text-sm text-mute">Delivery starts after your payment is verified.</li> : del.map((d: any) =>
        <li key={d.id} className="p-4 text-sm">{d.status === "delivered" ? (d.kind === "license_key" ? <Reveal id={d.id} /> : <p>{d.note}</p>) : <p className="text-mute">We are preparing this item.</p>}</li>)}</ul>
      <h2 className="mt-6 font-semibold">Timeline</h2>
      <ol className="mt-2 space-y-2 border-l border-line pl-4 text-sm">{ev.map((e: any) => <li key={e.id}><span className="font-medium capitalize">{e.status.replace(/_/g, " ")}</span> <span className="text-mute">{when(e.created_at)}</span>{e.message && <p className="text-mute">{e.message}</p>}</li>)}</ol>
      <Link to="/account/support" className="btn btn-ghost mt-8">Need help with this order?</Link>
    </div>
  );
}

export function Profile() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch(async () => (await db().from("profiles").select("full_name,phone,email").eq("id", user!.id).maybeSingle()).data, [user?.id]);
  const [name, setName] = useState<string | null>(null), [phone, setPhone] = useState<string | null>(null), [msg, setMsg] = useState("");
  if (loading) return <p className="text-mute">Loading…</p>;
  const save = async (e: FormEvent) => { e.preventDefault(); const { error } = await db().from("profiles").update({ full_name: name ?? data?.full_name, phone: phone ?? data?.phone }).eq("id", user!.id); setMsg(error ? "Could not save." : "Saved."); };
  const f = "mt-1 w-full max-w-sm rounded-xl border border-line px-3 py-2.5 text-sm";
  return (
    <form onSubmit={save}><h1 className="text-2xl font-bold tracking-tight">My Profile</h1><Err e={error} />
      <p className="mt-4 text-sm text-mute">{data?.email}</p>
      <label className="mt-4 block text-sm font-medium">Full name<input className={f} value={name ?? data?.full_name ?? ""} onChange={(e) => setName(e.target.value)} /></label>
      <label className="mt-4 block text-sm font-medium">Phone (optional)<input className={f} value={phone ?? data?.phone ?? ""} onChange={(e) => setPhone(e.target.value)} /></label>
      <button className="btn btn-primary mt-5">Save</button> <span className="ml-3 text-sm text-mute" role="status">{msg}</span></form>
  );
}

export function Notifications() {
  const { data, reload, error } = useFetch(async () => (await db().from("notifications").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [], []);
  const read = async (id: string) => { await db().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id); reload(); };
  return (
    <div><h1 className="text-2xl font-bold tracking-tight">Notifications</h1><Err e={error} />
      <ul className="card mt-5 divide-y divide-line">{(data ?? []).map((n: any) => <li key={n.id} className="flex items-start justify-between gap-3 p-4 text-sm"><div><p className={n.read_at ? "" : "font-semibold"}>{n.title}</p><p className="text-mute">{n.body}</p><p className="text-xs text-mute">{when(n.created_at)}</p></div>{!n.read_at && <button className="text-brand" onClick={() => read(n.id)}>Mark read</button>}</li>)}
        {!data?.length && <li className="p-4 text-sm text-mute">Nothing yet.</li>}</ul></div>
  );
}

export function Support() {
  const { user } = useAuth();
  const [open, setOpen] = useState<string | null>(null), [subject, setSubject] = useState(""), [category, setCategory] = useState("Order"), [orderNo, setOrderNo] = useState(""), [text, setText] = useState(""), [msg, setMsg] = useState("");
  const { data, reload } = useFetch(async () => (await db().from("support_tickets").select("*").order("created_at", { ascending: false })).data ?? [], []);
  const thread = useFetch(async () => open ? (await db().from("support_messages").select("*").eq("ticket_id", open).order("created_at")).data ?? [] : [], [open]);
  const create = async (e: FormEvent) => {
    e.preventDefault(); setMsg("");
    let order_id: string | null = null;
    if (orderNo.trim()) { const r = await db().from("orders").select("id").eq("order_number", orderNo.trim()).maybeSingle(); order_id = r.data?.id ?? null; if (!order_id) { setMsg("Order number not found on your account."); return; } }
    const t = await db().from("support_tickets").insert({ user_id: user!.id, order_id, category, subject: subject.trim() }).select("id").single();
    if (t.error) { setMsg("Could not create ticket."); return; }
    await db().from("support_messages").insert({ ticket_id: t.data.id, author_id: user!.id, body: text.trim() });
    setSubject(""); setText(""); setOrderNo(""); setMsg("Ticket created."); reload();
  };
  const reply = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); const body = String(f.get("b")).trim(); if (!body || !open) return; await db().from("support_messages").insert({ ticket_id: open, author_id: user!.id, body }); e.currentTarget.reset(); thread.reload(); };
  const f = "mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm";
  return (
    <div><h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
      <form onSubmit={create} className="card mt-5 max-w-lg p-4">
        <label className="text-sm font-medium">Issue<select className={f} value={category} onChange={(e) => setCategory(e.target.value)}>{["Order", "Payment", "Delivery", "Refund", "Other"].map((c) => <option key={c}>{c}</option>)}</select></label>
        <label className="mt-3 block text-sm font-medium">Order number (optional)<input className={f} value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="BD-100001" /></label>
        <label className="mt-3 block text-sm font-medium">Subject<input required className={f} value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
        <label className="mt-3 block text-sm font-medium">Message<textarea required rows={4} className={f} value={text} onChange={(e) => setText(e.target.value)} /></label>
        <button className="btn btn-primary mt-4">Submit ticket</button> <span className="ml-2 text-sm text-mute" role="status">{msg}</span></form>
      <ul className="card mt-6 divide-y divide-line">{(data ?? []).map((t: any) => <li key={t.id}><button className="flex w-full justify-between p-4 text-left text-sm hover:bg-soft" onClick={() => setOpen(open === t.id ? null : t.id)}><span>{t.subject}</span>{badge(t.status)}</button>
        {open === t.id && <div className="border-t border-line bg-soft p-4 text-sm">{(thread.data ?? []).map((m: any) => <p key={m.id} className="mb-2"><span className="font-medium">{m.is_staff ? "Support" : "You"}:</span> {m.body}</p>)}
          {t.status !== "closed" && <form onSubmit={reply} className="mt-3 flex gap-2"><input name="b" required className="flex-1 rounded-xl border border-line px-3 py-2" aria-label="Reply" /><button className="btn btn-primary !py-2">Reply</button></form>}</div>}</li>)}
        {!data?.length && <li className="p-4 text-sm text-mute">No tickets.</li>}</ul></div>
  );
}
