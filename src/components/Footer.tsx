import { Link } from "react-router-dom";
import Logo from "./Logo";
import { useCatalog } from "../lib/catalog";
import { useT } from "../lib/i18n";
import { useSettings } from "../lib/settings";

export default function Footer() {
  const { categories } = useCatalog();
  const { t } = useT();
  const s = useSettings();
  const h = "mb-3 text-sm font-semibold", l = "block py-1 text-sm text-mute hover:text-brand";
  const social = [["facebook", "Facebook"], ["instagram", "Instagram"], ["tiktok", "TikTok"], ["youtube", "YouTube"]].filter(([k]) => s[k]);
  return (
    <footer className="mt-24 border-t border-line bg-soft">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-4">
        <div><Logo /><p className="mt-3 max-w-xs text-sm text-mute">{t("footerBlurb")}</p>
          {social.length > 0 && <p className="mt-4 flex flex-wrap gap-3 text-sm">{social.map(([k, n]) => <a key={k} href={s[k]} target="_blank" rel="noopener noreferrer" className="text-mute hover:text-brand">{n}</a>)}</p>}</div>
        <div><p className={h}>{t("quickLinks")}</p><Link className={l} to="/products">{t("products")}</Link><Link className={l} to="/categories">{t("categories")}</Link><Link className={l} to="/about">{t("about")}</Link><Link className={l} to="/faq">{t("faq")}</Link></div>
        <div><p className={h}>{t("categories")}</p>{categories.slice(0, 5).map((c) => <Link key={c.slug} className={l} to={`/categories/${c.slug}`}>{c.name}</Link>)}</div>
        <div><p className={h}>{t("support")}</p><Link className={l} to="/contact">{t("contactUs")}</Link><Link className={l} to="/privacy-policy">{t("privacy")}</Link><Link className={l} to="/terms-and-conditions">{t("terms")}</Link><Link className={l} to="/refund-policy">{t("refund")}</Link><Link className={l} to="/shipping-and-delivery">{t("delivery")}</Link></div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-mute">© {new Date().getFullYear()} {s.store_name || "BuyDigital"}. {t("rights")}</div>
    </footer>
  );
}
