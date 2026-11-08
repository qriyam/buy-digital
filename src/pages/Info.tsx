import { Link, useLocation } from "react-router-dom";
const pages: Record<string, [string, string]> = {
  "/about": ["About BuyDigital", "BuyDigital is an independent online store for digital products in Malaysia, priced in RM. We are not affiliated with, or endorsed by, the brands whose products we list."],
  "/contact": ["Contact", "Support email and contact details are configured by the store admin. Placeholder: support@buydigital.my"],
  "/faq": ["How it works", "Choose a product and option, pay at checkout, and receive delivery after your payment is verified. Delivery method and timing are shown on each product page."],
  "/privacy-policy": ["Privacy Policy", "Draft. Replace with your reviewed privacy policy before launch."],
  "/terms-and-conditions": ["Terms & Conditions", "Draft. Replace with your reviewed terms before launch."],
  "/refund-policy": ["Refund Policy", "Draft. Replace with your reviewed refund policy before launch."],
  "/login": ["Login / Sign Up", "Accounts are not connected yet. Authentication arrives with the backend phase."],
};
export default function Info() {
  const { pathname } = useLocation();
  const [t, body] = pages[pathname] ?? ["", ""];
  return <div className="mx-auto max-w-2xl px-4 py-16"><h1 className="text-3xl font-bold tracking-tight">{t}</h1><p className="mt-4 text-mute">{body}</p><Link to="/" className="btn btn-ghost mt-8">Back home</Link></div>;
}
