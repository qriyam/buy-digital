import { useState, type FormEvent } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, Search, ShoppingCart, X } from "lucide-react";
import Logo from "./Logo";
import { useCart } from "../lib/cart";

const nav = [["/", "Home"], ["/products", "Products"], ["/categories", "Categories"], ["/about", "About"], ["/contact", "Contact"]] as const;

export default function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const go = useNavigate();
  const submit = (e: FormEvent) => { e.preventDefault(); go(`/products?q=${encodeURIComponent(q.trim())}`); setOpen(false); };
  const link = ({ isActive }: { isActive: boolean }) => `text-sm font-medium ${isActive ? "text-brand" : "text-ink hover:text-brand"}`;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
          {nav.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"} className={link}>{label}</NavLink>)}
        </nav>
        <div className="flex items-center gap-2">
          <form onSubmit={submit} className="hidden items-center rounded-xl border border-line bg-soft px-3 lg:flex">
            <Search className="h-4 w-4 text-mute" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" className="w-44 bg-transparent px-2 py-2 text-sm outline-none" />
          </form>
          <Link to="/cart" className="relative rounded-xl p-2 hover:bg-soft" aria-label={`Cart, ${count} items`}>
            <ShoppingCart className="h-5 w-5" aria-hidden />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold text-white">{count}</span>}
          </Link>
          <Link to="/login" className="btn btn-primary hidden md:inline-flex">Login / Sign Up</Link>
          <button className="rounded-xl p-2 hover:bg-soft md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>
      {open && (
        <div className="border-t border-line px-4 py-4 md:hidden">
          <form onSubmit={submit} className="mb-3 flex items-center rounded-xl border border-line bg-soft px-3">
            <Search className="h-4 w-4 text-mute" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" className="w-full bg-transparent px-2 py-2.5 text-sm outline-none" />
          </form>
          <div className="flex flex-col gap-1">
            {nav.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"} onClick={() => setOpen(false)} className={(s) => `rounded-lg px-2 py-2.5 ${link(s)}`}>{label}</NavLink>)}
            <Link to="/login" onClick={() => setOpen(false)} className="btn btn-primary mt-2">Login / Sign Up</Link>
          </div>
        </div>
      )}
    </header>
  );
}
