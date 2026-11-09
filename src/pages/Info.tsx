import { Link, useLocation } from "react-router-dom";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { useSettings } from "../lib/settings";
import Seo from "../lib/seo";

const pages: Record<string, [string, string, string]> = {
  "/about": ["About BuyDigital", "page_about", "About BuyDigital: an independent online store for digital products in Malaysia."],
  "/faq": ["How it works", "page_faq", "How ordering and delivery work at BuyDigital."],
  "/privacy-policy": ["Privacy Policy", "page_privacy", "How BuyDigital collects and uses your data."],
  "/terms-and-conditions": ["Terms & Conditions", "page_terms", "BuyDigital terms and conditions."],
  "/refund-policy": ["Refund Policy", "page_refund", "BuyDigital refund policy."],
  "/shipping-and-delivery": ["Shipping & Delivery", "page_delivery", "How BuyDigital delivers digital products."],
  "/contact": ["Contact", "", "Contact BuyDigital support."],
};
export default function Info() {
  const { pathname } = useLocation();
  const s = useSettings();
  const [title, key, desc] = pages[pathname] ?? ["", "", ""];
  const contact = pathname === "/contact";
  const wa = s.whatsapp?.replace(/\D/g, "");
  return (
    <div className="mx-auto max-w-2xl px-4 py-16"><Seo title={title} path={pathname} description={desc} />
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {key && <div className="mt-4 whitespace-pre-line leading-relaxed text-mute">{s[key]}</div>}
      {contact && <ul className="mt-6 space-y-3 text-sm">
        {s.support_email && <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-brand" aria-hidden /><a href={`mailto:${s.support_email}`}>{s.support_email}</a></li>}
        {s.support_phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-brand" aria-hidden /><a href={`tel:${s.support_phone}`}>{s.support_phone}</a></li>}
        {wa && <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-brand" aria-hidden /><a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>}
        <li className="text-mute">Logged-in customers can also open a ticket from <Link className="text-brand" to="/account/support">Support Tickets</Link>.</li></ul>}
      <Link to="/" className="btn btn-ghost mt-8">Back home</Link>
    </div>
  );
}
