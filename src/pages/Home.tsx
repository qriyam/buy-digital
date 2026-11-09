import { Link } from "react-router-dom";
import { Headphones, ShieldCheck, Zap, BadgeCheck } from "lucide-react";
import { useCatalog } from "../lib/catalog";
import { useT } from "../lib/i18n";
import { Icon } from "../lib/icons";
import ProductCard from "../components/ProductCard";
import Seo from "../lib/seo";

export default function Home() {
  const { categories, products, loading } = useCatalog();
  const { t } = useT();
  const count = (slug: string) => products.filter((p) => p.category === slug).length;
  const popular = products.filter((p) => p.popular || p.featured).slice(0, 8);
  const trust = [[Zap, t("trust1")], [ShieldCheck, t("trust2")], [Headphones, t("trust3")]] as const;
  const why = [[Zap, t("w1"), t("w1d")], [ShieldCheck, t("w2"), t("w2d")], [Headphones, t("w3"), t("w3d")], [BadgeCheck, t("w4"), t("w4d")]] as const;
  return (
    <>
      <Seo title="BuyDigital — Your Digital World, Simplified" path="/" description="Subscriptions, software, AI tools, gift cards and gaming top-ups for Malaysia, priced in RM. Pay securely and get your digital products delivered."
        jsonLd={{ "@context": "https://schema.org", "@type": "Organization", name: "BuyDigital", url: "https://buydigital.my" }} />
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">{t("heroTitle")}</h1>
          <p className="mt-5 max-w-md text-lg text-mute">{t("heroSub")}</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link to="/products" className="btn btn-primary">{t("explore")}</Link><Link to="/faq" className="btn btn-ghost">{t("how")}</Link></div>
          <ul className="mt-10 grid gap-3 text-sm sm:grid-cols-3">{trust.map(([I, x]) => <li key={x} className="flex items-center gap-2"><I className="h-4 w-4 shrink-0 text-brand" aria-hidden />{x}</li>)}</ul>
        </div>
        <div className="relative mx-auto grid h-[360px] w-full max-w-sm place-items-center" aria-hidden>
          <div className="absolute inset-6 rounded-[40px] bg-soft" />
          <div className="relative h-[320px] w-[170px] rounded-[28px] border-[6px] border-ink bg-white p-3 shadow-lg">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" />
            {categories.slice(0, 3).map((c, i) => <div key={c.slug} className={`mb-2 flex items-center gap-2 rounded-xl p-2.5 text-xs font-medium ${i === 0 ? "bg-brand text-white" : "bg-soft"}`}>{c.name}</div>)}
          </div>
          {(["Tv", "Sparkles", "Gift", "Gamepad2"] as const).map((n, i) => <div key={n} className="absolute grid h-12 w-12 place-items-center rounded-2xl border border-line bg-white text-brand shadow-sm" style={{ top: ["6%", "18%", "62%", "76%"][i], left: ["4%", "78%", "0%", "80%"][i] }}><Icon name={n} className="h-5 w-5" /></div>)}
        </div>
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-2xl font-bold tracking-tight">{t("shopByCategory")}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <Link key={c.slug} to={`/categories/${c.slug}`} className="card p-5 transition hover:border-brand/40">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><Icon name={c.icon} className="h-5 w-5" /></span>
                <p className="mt-3 font-semibold">{c.name}</p><p className="mt-1 text-sm text-mute">{c.blurb}</p>
                <p className="mt-3 text-xs text-mute">{count(c.slug)} {count(c.slug) === 1 ? t("productWord") : t("productsWord")}</p>
              </Link>))}
          </div>
        </section>)}

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-end justify-between"><h2 className="text-2xl font-bold tracking-tight">{t("popular")}</h2><Link to="/products" className="text-sm font-medium text-brand">{t("viewAll")}</Link></div>
        {loading ? <p className="mt-6 text-mute">{t("loading")}</p> : popular.length === 0 ? <p className="mt-6 text-mute">{t("storeSetup")}</p> :
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{popular.map((p) => <ProductCard key={p.slug} p={p} />)}</div>}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold tracking-tight">{t("why")}</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{why.map(([I, a, d]) => <div key={a}><I className="h-6 w-6 text-brand" aria-hidden /><p className="mt-3 font-semibold">{a}</p><p className="mt-1 text-sm text-mute">{d}</p></div>)}</div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl px-4"><div className="rounded-3xl bg-brand px-6 py-14 text-center text-white">
        <h2 className="text-3xl font-bold tracking-tight">{t("ctaTitle")}</h2><p className="mx-auto mt-3 max-w-md text-white/90">{t("ctaDesc")}</p>
        <Link to="/products" className="btn mt-7 bg-white text-brand hover:bg-soft">{t("ctaBtn")}</Link></div></section>
    </>
  );
}
