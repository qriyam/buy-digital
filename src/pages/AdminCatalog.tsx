import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useFetch } from "../lib/useFetch";
import { iconNames } from "../lib/icons";
import { rm } from "../lib/format";
import { db, Err, H, inp, Table } from "./Admin";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const safe = (n: string) => n.replace(/[^a-zA-Z0-9._-]/g, "_");

export function AdminProducts() {
  const { data, error } = useFetch(async () => (await db().from("products").select("id,slug,name,delivery_method,is_active,archived_at,categories(name),product_variants(price)").order("name")).data ?? [], []);
  return (
    <div><div className="flex items-center justify-between"><H>Products</H><Link to="/admin/products/new" className="btn btn-primary">New product</Link></div><Err e={error} />
      <Table head={["Product", "Category", "Delivery", "Price", "Status", ""]} rows={(data ?? []).map((p: any) => {
        const prices = p.product_variants.map((v: any) => Number(v.price)); return [p.name, p.categories?.name ?? "—", p.delivery_method.replace("_", " "),
          prices.length ? (Math.min(...prices) === Math.max(...prices) ? rm(prices[0]) : `${rm(Math.min(...prices))} – ${rm(Math.max(...prices))}`) : "—",
          p.archived_at ? "Archived" : p.is_active ? "Active" : "Hidden", <Link key="e" className="text-brand" to={`/admin/products/${p.id}`}>Edit</Link>]; })} />
      {!data?.length && <p className="mt-4 text-sm text-mute">No products yet. Create your first product.</p>}</div>
  );
}

type V = { id?: string; label: string; price: string; is_available: boolean; is_active: boolean; file_path: string | null; download_limit: string; download_expiry_days: string; sort_order: number };
const blankV = (n: number): V => ({ label: "", price: "", is_available: true, is_active: true, file_path: null, download_limit: "", download_expiry_days: "", sort_order: n });

export function AdminProductForm() {
  const { id } = useParams(); const go = useNavigate();
  const isNew = !id || id === "new";
  const cats = useFetch(async () => (await db().from("categories").select("id,name").order("sort_order")).data ?? [], []);
  const loaded = useFetch(async () => {
    if (isNew) return null;
    const [p, v, im] = await Promise.all([db().from("products").select("*").eq("id", id).maybeSingle(), db().from("product_variants").select("*").eq("product_id", id).order("sort_order"), db().from("product_images").select("*").eq("product_id", id).order("sort_order")]);
    return { p: p.data, v: v.data ?? [], im: im.data ?? [] };
  }, [id]);
  const [f, setF] = useState<any>(null), [vs, setVs] = useState<V[] | null>(null), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const form = f ?? (isNew ? { name: "", slug: "", description: "", category_id: "", delivery_method: "manual", delivery_estimate: "", validity: "", instructions: "", refund_note: "", is_active: false, is_featured: false, is_popular: false } : loaded.data?.p);
  const variants: V[] = vs ?? (isNew ? [blankV(0)] : (loaded.data?.v ?? []).map((v: any) => ({ id: v.id, label: v.label, price: String(v.price), is_available: v.is_available, is_active: v.is_active, file_path: v.file_path, download_limit: v.download_limit ?? "", download_expiry_days: v.download_expiry_days ?? "", sort_order: v.sort_order })));
  if (!isNew && loaded.loading) return <p className="text-mute">Loading…</p>;
  if (!form) return <p className="text-brand">Product not found.</p>;
  const set = (k: string, v: unknown) => setF({ ...form, [k]: v });
  const setV = (i: number, patch: Partial<V>) => setVs(variants.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const L = "mt-1 w-full " + inp;

  const save = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return; setBusy(true); setMsg("");
    try {
      if (!form.name.trim() || variants.some((v) => !v.label.trim() || !(Number(v.price) >= 0) || v.price === "")) throw new Error("Name and every option's label and price are required.");
      const body = { name: form.name.trim(), slug: slugify(form.slug || form.name), description: form.description || null, category_id: form.category_id || null, delivery_method: form.delivery_method,
        delivery_estimate: form.delivery_estimate || null, validity: form.validity || null, instructions: form.instructions || null, refund_note: form.refund_note || null, is_active: form.is_active, is_featured: form.is_featured, is_popular: form.is_popular };
      let pid = id!;
      if (isNew) { const r = await db().from("products").insert(body).select("id").single(); if (r.error) throw new Error(r.error.message.includes("duplicate") ? "That URL slug is already used." : "Could not create product."); pid = r.data.id; }
      else { const r = await db().from("products").update(body).eq("id", pid); if (r.error) throw new Error("Could not save product."); }
      const keep: string[] = [];
      for (const [i, v] of variants.entries()) {
        const row = { product_id: pid, label: v.label.trim(), price: Number(v.price).toFixed(2), is_available: v.is_available, is_active: v.is_active, sort_order: i, file_path: v.file_path,
          download_limit: v.download_limit === "" ? null : Number(v.download_limit), download_expiry_days: v.download_expiry_days === "" ? null : Number(v.download_expiry_days) };
        if (v.id) { const r = await db().from("product_variants").update(row).eq("id", v.id); if (r.error) throw new Error("Could not save an option."); keep.push(v.id); }
        else { const r = await db().from("product_variants").insert(row).select("id").single(); if (r.error) throw new Error("Could not save an option."); keep.push(r.data.id); }
      }
      if (!isNew) for (const old of loaded.data?.v ?? []) if (!keep.includes(old.id)) await db().from("product_variants").update({ is_active: false, is_available: false }).eq("id", old.id);   // never hard-delete: orders reference variants
      setMsg("Saved."); if (isNew) go(`/admin/products/${pid}`, { replace: true }); else { setF(null); setVs(null); loaded.reload(); }
    } catch (x) { setMsg((x as Error).message); }
    setBusy(false);
  };
  const uploadImage = async (file: File | undefined) => {
    if (!file || isNew) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2_000_000) { setMsg("Images must be PNG, JPEG or WebP under 2 MB."); return; }
    const path = `${id}/${Date.now()}-${safe(file.name)}`;
    const up = await db().storage.from("product-images").upload(path, file, { contentType: file.type });
    if (up.error) { setMsg("Upload failed."); return; }
    await db().from("product_images").insert({ product_id: id, path, sort_order: (loaded.data?.im.length ?? 0) }); loaded.reload();
  };
  const removeImage = async (im: any) => { await db().storage.from("product-images").remove([im.path]); await db().from("product_images").delete().eq("id", im.id); loaded.reload(); };
  const uploadFile = async (i: number, file: File | undefined) => {
    if (!file || isNew) return; if (file.size > 50_000_000) { setMsg("Files must be under 50 MB."); return; }
    const path = `${id}/${Date.now()}-${safe(file.name)}`;
    const up = await db().storage.from("product-files").upload(path, file); if (up.error) { setMsg("File upload failed."); return; }
    setV(i, { file_path: path }); setMsg("File uploaded. Save to attach it.");
  };
  const archive = async () => { if (!confirm("Archive this product? It disappears from the store but past orders keep working.")) return; await db().from("products").update({ archived_at: new Date().toISOString(), is_active: false }).eq("id", id); go("/admin/products"); };
  const restore = async () => { await db().from("products").update({ archived_at: null }).eq("id", id); loaded.reload(); };

  return (
    <form onSubmit={save} className="max-w-3xl"><H>{isNew ? "New product" : "Edit product"}</H>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Name<input required className={L} value={form.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="text-sm font-medium">URL slug<input className={L} value={form.slug} placeholder={slugify(form.name)} onChange={(e) => set("slug", e.target.value)} /></label>
        <label className="text-sm font-medium">Category<select className={L} value={form.category_id ?? ""} onChange={(e) => set("category_id", e.target.value)}><option value="">None</option>{(cats.data ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="text-sm font-medium">Delivery method<select className={L} value={form.delivery_method} onChange={(e) => set("delivery_method", e.target.value)} disabled={!isNew && !!loaded.data?.v.length && false}>
          <option value="license_key">Automatic license key / code</option><option value="file">Automatic file download</option><option value="manual">Manual fulfilment</option><option value="subscription">Authorised subscription activation (manual)</option></select></label>
        <label className="text-sm font-medium">Delivery estimate<input className={L} value={form.delivery_estimate ?? ""} onChange={(e) => set("delivery_estimate", e.target.value)} placeholder="e.g. Within 24 hours" /></label>
        <label className="text-sm font-medium">Validity<input className={L} value={form.validity ?? ""} onChange={(e) => set("validity", e.target.value)} placeholder="e.g. 30 days from activation" /></label>
      </div>
      <label className="mt-4 block text-sm font-medium">Description<textarea rows={4} className={L} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></label>
      <label className="mt-4 block text-sm font-medium">Instructions for the customer<textarea rows={3} className={L} value={form.instructions ?? ""} onChange={(e) => set("instructions", e.target.value)} /></label>
      <label className="mt-4 block text-sm font-medium">Refund eligibility note<textarea rows={2} className={L} value={form.refund_note ?? ""} onChange={(e) => set("refund_note", e.target.value)} /></label>
      <div className="mt-4 flex flex-wrap gap-5 text-sm">{[["is_active", "Visible in store"], ["is_featured", "Featured"], ["is_popular", "Popular"]].map(([k, l]) => <label key={k}><input type="checkbox" checked={!!form[k]} onChange={(e) => set(k, e.target.checked)} /> {l}</label>)}</div>

      <h2 className="mt-8 font-semibold">Options and prices (MYR)</h2>
      <div className="mt-3 space-y-3">{variants.map((v, i) => (
        <div key={v.id ?? i} className="card p-3 text-sm"><div className="flex flex-wrap items-end gap-3">
          <label>Label<input className={`${inp} mt-1 block w-40`} value={v.label} onChange={(e) => setV(i, { label: e.target.value })} placeholder="1 Month" /></label>
          <label>Price RM<input type="number" step="0.01" min="0" className={`${inp} mt-1 block w-28`} value={v.price} onChange={(e) => setV(i, { price: e.target.value })} /></label>
          <label><input type="checkbox" checked={v.is_available} onChange={(e) => setV(i, { is_available: e.target.checked })} /> Available</label>
          <label><input type="checkbox" checked={v.is_active} onChange={(e) => setV(i, { is_active: e.target.checked })} /> Shown</label>
          <button type="button" className="text-brand" onClick={() => setVs(variants.filter((_, j) => j !== i))}>Remove</button></div>
          {form.delivery_method === "file" && <div className="mt-3 flex flex-wrap items-end gap-3"><label>File<input type="file" disabled={isNew} className="mt-1 block" onChange={(e) => uploadFile(i, e.target.files?.[0])} /></label>
            <span className="text-mute">{v.file_path ? "File attached" : isNew ? "Save the product first, then upload" : "No file yet"}</span>
            <label>Download limit<input type="number" min="1" className={`${inp} mt-1 block w-24`} value={v.download_limit} onChange={(e) => setV(i, { download_limit: e.target.value })} placeholder="5" /></label>
            <label>Expires (days)<input type="number" min="1" className={`${inp} mt-1 block w-24`} value={v.download_expiry_days} onChange={(e) => setV(i, { download_expiry_days: e.target.value })} placeholder="30" /></label></div>}
          {form.delivery_method === "license_key" && <p className="mt-2 text-mute">Stock comes from the codes you upload in Digital Inventory.</p>}</div>))}</div>
      <button type="button" className="btn btn-ghost mt-3" onClick={() => setVs([...variants, blankV(variants.length)])}>Add option</button>

      {!isNew && <><h2 className="mt-8 font-semibold">Images</h2><div className="mt-3 flex flex-wrap gap-3">{(loaded.data?.im ?? []).map((im: any) => (
        <div key={im.id} className="text-center text-xs"><img src={db().storage.from("product-images").getPublicUrl(im.path).data.publicUrl} alt="" className="h-20 w-20 rounded-lg border border-line object-contain" />
          <button type="button" className="mt-1 text-brand" onClick={() => removeImage(im)}>Remove</button></div>))}</div>
        <input type="file" accept="image/png,image/jpeg,image/webp" className="mt-3 text-sm" onChange={(e) => uploadImage(e.target.files?.[0])} /></>}
      {isNew && <p className="mt-6 text-sm text-mute">Save first, then add images and files.</p>}

      <div className="mt-8 flex flex-wrap items-center gap-3"><button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save product"}</button>
        {!isNew && (loaded.data?.p?.archived_at ? <button type="button" className="btn btn-ghost" onClick={restore}>Restore</button> : <button type="button" className="btn btn-ghost" onClick={archive}>Archive</button>)}
        <Link to="/admin/products" className="text-sm text-mute">Back</Link><span className="text-sm" role="status">{msg}</span></div>
    </form>
  );
}

export function AdminCategories() {
  const { data, reload, error } = useFetch(async () => (await db().from("categories").select("*").order("sort_order")).data ?? [], []);
  const [msg, setMsg] = useState("");
  const patch = async (id: string, p: object) => { const r = await db().from("categories").update(p).eq("id", id); setMsg(r.error ? "Update failed." : ""); reload(); };
  const move = async (i: number, d: number) => { const a = data![i], b = data![i + d]; if (!b) return; await Promise.all([patch(a.id, { sort_order: b.sort_order }), patch(b.id, { sort_order: a.sort_order })]); };
  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const name = String(fd.get("name")).trim();
    const r = await db().from("categories").insert({ name, slug: slugify(String(fd.get("slug")) || name), description: String(fd.get("description")) || null, icon: String(fd.get("icon")), sort_order: (data?.length ?? 0) + 1 });
    setMsg(r.error ? "Could not create (duplicate slug?)." : "Created."); if (!r.error) { e.currentTarget.reset(); reload(); }
  };
  return (
    <div><H>Categories</H><Err e={error} /><p className="mt-1 text-sm text-mute" role="status">{msg}</p>
      <form onSubmit={create} className="card mt-4 grid max-w-3xl gap-3 p-4 sm:grid-cols-4"><input name="name" required placeholder="Name" className={inp} aria-label="Name" /><input name="slug" placeholder="slug (auto)" className={inp} aria-label="Slug" />
        <select name="icon" className={inp} aria-label="Icon">{iconNames.map((n) => <option key={n}>{n}</option>)}</select><input name="description" placeholder="Short description" className={inp} aria-label="Description" /><button className="btn btn-primary sm:col-span-4">Add category</button></form>
      <div className="mt-5 space-y-2">{(data ?? []).map((c: any, i: number) => (
        <div key={c.id} className="card flex flex-wrap items-center gap-3 p-3 text-sm">
          <input className={`${inp} w-44`} defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && patch(c.id, { name: e.target.value })} aria-label="Name" />
          <select className={inp} value={c.icon ?? "Package"} onChange={(e) => patch(c.id, { icon: e.target.value })} aria-label="Icon">{iconNames.map((n) => <option key={n}>{n}</option>)}</select>
          <input className={`${inp} min-w-0 flex-1`} defaultValue={c.description ?? ""} onBlur={(e) => e.target.value !== (c.description ?? "") && patch(c.id, { description: e.target.value })} aria-label="Description" />
          <label><input type="checkbox" checked={c.is_active} onChange={(e) => patch(c.id, { is_active: e.target.checked })} /> Active</label>
          <button disabled={i === 0} onClick={() => move(i, -1)} className="px-2 disabled:opacity-30" aria-label="Move up">↑</button><button disabled={i === data!.length - 1} onClick={() => move(i, 1)} className="px-2 disabled:opacity-30" aria-label="Move down">↓</button></div>))}</div></div>
  );
}
