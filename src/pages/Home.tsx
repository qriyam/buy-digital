import { Link } from "react-router-dom";
import { Headphones, ShieldCheck, Zap, BadgeCheck } from "lucide-react";
import { categories, products } from "../data/catalog";
import { Icon } from "../lib/icons";
import ProductCard from "../components/ProductCard";

const trust = [[Zap, "Instant Digital Delivery"], [ShieldCheck, "Secure Payments"], [Headphones, "24/7 Customer Support"]] as const;
const why = [
  [Zap, "Instant Delivery", "Receive eligible digital products quickly after successful payment."],
  [ShieldCheck, "Secure Payments", "Secure checkout with supported payment providers."],
  [Headphones, "24/7 Support", "Get help whenever you need it."],
  [BadgeCheck, "Trusted Shopping", "Transparent pricing, clear product descriptions, and reliable order tracking."],
] as const;

export default function Home() {
  const count = (slug: string) => products.filter((p) => p.category === slug).length;
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">Your Digital World, Simplified.</h1>
          <p className="mt-5 max-w-md text-lg text-mute">Get your favorite subscriptions, software, AI tools, gift cards and more — all in one place.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link to="/products" className="btn btn-primary">Explore Products</Link><Link to="/faq" className="btn btn-ghost">How It Works</Link></div>
          <ul className="mt-10 grid gap-3 text-sm sm:grid-cols-3">
            {trust.map(([I, t]) => <li key={t} className="flex items-center gap-2"><I className="h-4 w-4 shrink-0 text-brand" aria-hidden />{t}</li>)}
          </ul>
        </div>
        <div className="relative mx-auto grid h-[360px] w-full max-w-sm place-items-center" aria-hidden>
          <div className="absolute inset-6 rounded-[40px] bg-soft" />
          <div className="relative h-[320px] w-[170px] rounded-[28px] border-[6px] border-ink bg-white p-3 shadow-lg">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" />
            {["Streaming", "AI Tools", "Gift Cards"].map((t, i) => <div key={t} className={`mb-2 flex items-center gap-2 rounded-xl p-2.5 text-xs font-medium ${i === 0 ? "bg-brand text-white" : "bg-soft"}`}>{t}</div>)}
          </div>
          {(["Tv", "Sparkles", "Gift", "Gamepad2"] as const).map((n, i) => (
            <div key={n} className="absolute grid h-12 w-12 place-items-center rounded-2xl border border-line bg-white text-brand shadow-sm" style={{ top: ["6%", "18%", "62%", "76%"][i], left: ["4%", "78%", "0%", "80%"][i] }}><Icon name={n} className="h-5 w-5" /></div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold tracking-tight">Shop by category</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <Link key={c.slug} to={`/categories/${c.slug}`} className="card p-5 transition hover:border-brand/40">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><Icon name={c.icon} className="h-5 w-5" /></span>
              <p className="mt-3 font-semibold">{c.name}</p><p className="mt-1 text-sm text-mute">{c.blurb}</p>
              <p className="mt-3 text-xs text-mute">{count(c.slug)} {count(c.slug) === 1 ? "product" : "products"}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-end justify-between"><h2 className="text-2xl font-bold tracking-tight">Popular products</h2><Link to="/products" className="text-sm font-medium text-brand">View all</Link></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{products.filter((p) => p.featured).map((p) => <ProductCard key={p.slug} p={p} />)}</div>
        <p className="mt-4 text-xs text-mute">Prices shown are placeholders for demonstration and are managed by the store admin.</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold tracking-tight">Why choose BuyDigital?</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {why.map(([I, t, d]) => <div key={t}><I className="h-6 w-6 text-brand" aria-hidden /><p className="mt-3 font-semibold">{t}</p><p className="mt-1 text-sm text-mute">{d}</p></div>)}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-4">
        <div className="rounded-3xl bg-brand px-6 py-14 text-center text-white">
          <h2 className="text-3xl font-bold tracking-tight">Start Your Digital Journey Today</h2>
          <p className="mx-auto mt-3 max-w-md text-white/90">Discover digital products that make your everyday life easier.</p>
          <Link to="/products" className="btn mt-7 bg-white text-brand hover:bg-soft">Explore All Products</Link>
        </div>
      </section>
    </>
  );
}
