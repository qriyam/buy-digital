import { Link } from "react-router-dom";
import { Headphones, ShieldCheck, Zap, BadgeCheck } from "lucide-react";
import { useCatalog } from "../lib/catalog";
import { useT } from "../lib/i18n";
import { Icon } from "../lib/icons";
import CatIcon from "../components/CatIcon";
import ProductCard from "../components/ProductCard";
import ProductSkeleton from "../components/ProductSkeleton";
import Reveal from "../components/Reveal";
import PhoneDemo from "../components/PhoneDemo";
import Seo from "../lib/seo";

export default function Home() {
  const { categories, products, loading, error, reload } = useCatalog();
  const { t } = useT();
  const count = (slug: string) => products.filter((p) => p.category === slug).length;
  const popular = products.filter((p) => p.popular || p.featured).slice(0, 8);
  const trust = [[Zap, t("trust1")], [ShieldCheck, t("trust2")], [Headphones, t("trust3")]] as const;
  const why = [[Zap, t("w1"), t("w1d")], [ShieldCheck, t("w2"), t("w2d")], [Headphones, t("w3"), t("w3d")], [BadgeCheck, t("w4"), t("w4d")]] as const;
  return (
    <>
      <Seo title="BuyDigital — Your Digital World, Simplified" path="/" description="Subscriptions, software, AI tools, gift cards and gaming top-ups for Malaysia, priced in RM. Pay securely and get your digital products delivered."
        jsonLd={{ "@context": "https://schema.org", "@type": "Organization", name: "BuyDigital", url: "https://buydigital.my" }} />
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand/5 blur-3xl" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:gap-10 md:py-24">
          <div>
            <span className="animate-fade-up inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">buydigital.my</span>
            <h1 className="animate-fade-up mt-4 text-[2rem] font-bold leading-[1.15] tracking-tight [animation-delay:80ms] sm:text-4xl md:text-5xl">{t("heroTitle")}</h1>
            <p className="animate-fade-up mt-4 max-w-md text-base text-mute [animation-delay:160ms] md:text-lg">{t("heroSub")}</p>
            <div className="animate-fade-up mt-7 flex flex-wrap gap-3 [animation-delay:240ms]"><Link to="/products" className="btn btn-primary animate-ring">{t("explore")}</Link><Link to="/faq" className="btn btn-ghost">{t("how")}</Link></div>
            <ul className="mt-8 grid gap-3 text-sm sm:grid-cols-3">{trust.map(([I, x], i) => <li key={x} className="animate-fade-up flex items-center gap-2" style={{ animationDelay: `${320 + i * 90}ms` }}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10"><I className="h-4 w-4 text-brand" aria-hidden /></span>{x}</li>)}</ul>
          </div>
          <div className="relative mx-auto grid h-[470px] w-full max-w-sm place-items-center md:h-[500px]">
            <div className="absolute inset-3 rounded-[40px] bg-gradient-to-br from-soft to-white" aria-hidden />
            <div className="animate-fade-up relative [animation-delay:200ms]"><PhoneDemo /></div>
            {(["Tv", "Sparkles", "Gift", "Gamepad2"] as const).map((n, i) => (
              <div key={n} className="animate-float absolute grid h-10 w-10 place-items-center rounded-2xl border border-line bg-white text-brand shadow-md md:h-12 md:w-12" aria-hidden
                style={{ top: ["3%", "14%", "66%", "80%"][i], left: ["0%", "80%", "-2%", "82%"][i], animationDelay: `${i * 600}ms`, animationDuration: `${3.6 + i * 0.5}s` }}><Icon name={n} className="h-5 w-5" /></div>))}
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <Reveal><section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="text-2xl font-bold tracking-tight">{t("shopByCategory")}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <Link key={c.slug} to={`/categories/${c.slug}`} className="card lift p-5 hover:border-brand/40">
                <CatIcon c={c} />
                <p className="mt-3 font-semibold">{c.name}</p><p className="mt-1 text-sm text-mute">{c.blurb}</p>
                <p className="mt-3 text-xs text-mute">{count(c.slug)} {count(c.slug) === 1 ? t("productWord") : t("productsWord")}</p>
              </Link>))}
          </div>
        </section></Reveal>)}

      <Reveal><section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-end justify-between"><h2 className="text-2xl font-bold tracking-tight">{t("popular")}</h2><Link to="/products" className="text-sm font-medium text-brand">{t("viewAll")}</Link></div>
        {loading ? <ProductSkeleton /> : error ? <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-4 text-sm" role="alert"><span>We couldn’t load the catalogue right now. Please try again.</span><button className="btn btn-ghost !py-2" onClick={reload}>Retry</button></div> : popular.length === 0 ? <p className="mt-6 text-mute">{t("storeSetup")}</p> :
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{popular.map((p) => <ProductCard key={p.slug} p={p} />)}</div>}
      </section></Reveal>

      <Reveal><section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold tracking-tight">{t("why")}</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{why.map(([I, a, d]) => <div key={a}><I className="h-6 w-6 text-brand" aria-hidden /><p className="mt-3 font-semibold">{a}</p><p className="mt-1 text-sm text-mute">{d}</p></div>)}</div>
      </section></Reveal>

      <Reveal><section className="mx-auto mt-10 max-w-6xl px-4"><div className="rounded-3xl bg-brand px-6 py-14 text-center text-white">
        <h2 className="text-3xl font-bold tracking-tight">{t("ctaTitle")}</h2><p className="mx-auto mt-3 max-w-md text-white/90">{t("ctaDesc")}</p>
        <Link to="/products" className="btn mt-7 bg-white text-brand hover:bg-soft">{t("ctaBtn")}</Link></div></section></Reveal>
    </>
  );
}
