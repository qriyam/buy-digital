import { Link } from "react-router-dom";
export default function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-bold tracking-tight text-lg" aria-label="BuyDigital home">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden><rect width="28" height="28" rx="8" fill="#E62117" /><path d="M9 11h10l-.8 9H9.8L9 11Z" fill="#fff" /><path d="M11.5 11V9.8a2.5 2.5 0 0 1 5 0V11" stroke="#fff" strokeWidth="1.5" fill="none" /><path d="M13 14.2v3l2.6-1.5-2.6-1.5Z" fill="#E62117" /></svg>
      <span>Buy<span className="text-brand">Digital</span></span>
    </Link>
  );
}
