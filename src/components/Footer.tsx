import { Link } from "react-router-dom";
import Logo from "./Logo";
import { useCatalog } from "../lib/catalog";
export default function Footer() {
  const { categories } = useCatalog();
  const h = "mb-3 text-sm font-semibold";
  const l = "block py-1 text-sm text-mute hover:text-brand";
  return (
    <footer className="mt-24 border-t border-line bg-soft">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-4">
        <div><Logo /><p className="mt-3 max-w-xs text-sm text-mute">Digital products for Malaysia, priced in RM. BuyDigital is an independent reseller and is not affiliated with the brands it lists.</p></div>
        <div><p className={h}>Quick links</p><Link className={l} to="/products">Products</Link><Link className={l} to="/categories">Categories</Link><Link className={l} to="/about">About</Link><Link className={l} to="/faq">FAQ</Link></div>
        <div><p className={h}>Categories</p>{categories.slice(0, 5).map((c) => <Link key={c.slug} className={l} to={`/categories/${c.slug}`}>{c.name}</Link>)}</div>
        <div><p className={h}>Support</p><Link className={l} to="/contact">Contact us</Link><Link className={l} to="/privacy-policy">Privacy Policy</Link><Link className={l} to="/terms-and-conditions">Terms &amp; Conditions</Link><Link className={l} to="/refund-policy">Refund Policy</Link></div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-mute">© {new Date().getFullYear()} BuyDigital. All rights reserved.</div>
    </footer>
  );
}
