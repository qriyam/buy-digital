import { useState, type FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Languages, Menu, Search, ShoppingCart, X } from "lucide-react";
import Logo from "./Logo";
import { useCart } from "../lib/cart";
import { useAuth } from "../lib/auth";
import { useT } from "../lib/i18n";
import { useSettings } from "../lib/settings";
import { live } from "../lib/supabase";

export default function Header() {
  const { count } = useCart();
  const { user } = useAuth();
  const { t, lang, setLang } = useT();
  const { announcement } = useSettings();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const go = useNavigate();
  const nav = [["/", t("home")], ["/products", t("products")], ["/categories", t("categories")], ["/about", t("about")], ["/contact", t("contact")]] as const;
  const submit = (e: FormEvent) => { e.preventDefault(); go(`/products?q=${encodeURIComponent(q.trim())}`); setOpen(false); };
  const link = ({ isActive }: { isActive: boolean }) => `text-sm font-medium ${isActive ? "text-brand" : "text-ink hover:text-brand"}`;
  const cta = user ? t("account") : t("login");
  const toggle = <button onClick={() => setLang(lang === "en" ? "ms" : "en")} className="flex items-center gap-1 rounded-xl p-2 text-xs font-semibold hover:bg-soft" aria-label={t("language")}><Languages className="h-4 w-4" aria-hidden />{lang === "en" ? "BM" : "EN"}</button>;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      {!live && <p className="bg-ink px-4 py-1.5 text-center text-xs font-medium text-white" role="alert">Setup needed: this build has no Supabase keys (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Add them in your hosting settings and redeploy.</p>}
      {announcement && <p className="bg-brand px-4 py-1.5 text-center text-xs font-medium text-white">{announcement}</p>}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">{nav.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"} className={link}>{label}</NavLink>)}</nav>
        <div className="flex items-center gap-1">
          <form onSubmit={submit} className="hidden items-center rounded-xl border border-line bg-soft px-3 lg:flex">
            <Search className="h-4 w-4 text-mute" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="w-44 bg-transparent px-2 py-2 text-sm outline-none" />
          </form>
          {toggle}
          <Link to="/cart" className="relative rounded-xl p-2 hover:bg-soft" aria-label={`${t("cart")}, ${count}`}>
            <ShoppingCart className="h-5 w-5" aria-hidden />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold text-white">{count}</span>}
          </Link>
          <Link to={user ? "/account" : "/login"} className="btn btn-primary ml-1 hidden md:inline-flex">{cta}</Link>
          <button className="rounded-xl p-2 hover:bg-soft md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>
      {open && (
        <div className="border-t border-line px-4 py-4 md:hidden">
          <form onSubmit={submit} className="mb-3 flex items-center rounded-xl border border-line bg-soft px-3"><Search className="h-4 w-4 text-mute" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="w-full bg-transparent px-2 py-2.5 text-sm outline-none" /></form>
          <div className="flex flex-col gap-1">{nav.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"} onClick={() => setOpen(false)} className={(s) => `rounded-lg px-2 py-2.5 ${link(s)}`}>{label}</NavLink>)}
            <Link to={user ? "/account" : "/login"} onClick={() => setOpen(false)} className="btn btn-primary mt-2">{cta}</Link></div>
        </div>
      )}
    </header>
  );
}
