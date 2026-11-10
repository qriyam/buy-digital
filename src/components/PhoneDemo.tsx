import { useEffect, useRef, useState } from "react";
import { Check, Lock, Mail, ShoppingCart } from "lucide-react";
import { useCatalog } from "../lib/catalog";
import { fromPrice, type Product } from "../data/catalog";
import { useT } from "../lib/i18n";
import { rm } from "../lib/format";

type Scene = "home" | "product" | "cart" | "paying" | "success" | "delivered";
type Frame = { scene: Scene; x: number; y: number; ms: number; tap?: boolean; hide?: boolean };

// The story: browse -> open a product -> Buy now -> cart -> pay -> success -> automatic delivery. Loops forever.
const FRAMES: Frame[] = [
  { scene: "home", x: 80, y: 74, ms: 1000 }, { scene: "home", x: 29, y: 38, ms: 900 }, { scene: "home", x: 29, y: 38, tap: true, ms: 650 },
  { scene: "product", x: 62, y: 56, ms: 800 }, { scene: "product", x: 72, y: 92, ms: 900 }, { scene: "product", x: 72, y: 92, tap: true, ms: 650 },
  { scene: "cart", x: 60, y: 52, ms: 900 }, { scene: "cart", x: 50, y: 92, ms: 900 }, { scene: "cart", x: 50, y: 92, tap: true, ms: 650 },
  { scene: "paying", x: 50, y: 50, hide: true, ms: 1700 }, { scene: "success", x: 50, y: 50, hide: true, ms: 2000 }, { scene: "delivered", x: 50, y: 50, hide: true, ms: 3600 },
];
const STATIC_FRAME = 4;   // product page, used when the visitor prefers reduced motion

function Thumb({ p, className = "" }: { p?: Product; className?: string }) {
  return p?.images[0] ? <img src={p.images[0]} alt="" className={`object-contain ${className}`} /> : <span className={`grid place-items-center font-bold text-brand ${className}`}>{p ? p.name[0] : ""}</span>;
}
const Bar = ({ w = "w-10" }: { w?: string }) => <span className={`block h-2 rounded bg-line ${w}`} />;

export default function PhoneDemo({ frame }: { frame?: number }) {
  const { products } = useCatalog();
  const { t } = useT();
  const items = (products.filter((p) => p.featured || p.popular).concat(products)).filter((p, i, a) => a.indexOf(p) === i).slice(0, 4);
  const main = items[0];
  const reduced = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [i, setI] = useState(frame ?? (reduced ? STATIC_FRAME : 0));
  const [visible, setVisible] = useState(true);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {   // pause while off-screen or in a background tab
    const el = box.current; if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.1 }); io.observe(el); return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (frame !== undefined || reduced || !visible) return;
    const id = setTimeout(() => setI((n) => (n + 1) % FRAMES.length), FRAMES[i].ms);
    return () => clearTimeout(id);
  }, [i, visible, reduced, frame]);

  const f = FRAMES[i];
  const inCart = i >= 5 && i < 11;
  const price = main ? rm(fromPrice(main)) : null;
  const opt = main?.variants.slice(0, 3) ?? [];
  const Price = ({ v, cls = "" }: { v: string | null; cls?: string }) => v ? <span className={cls}>{v}</span> : <Bar w="w-12" />;

  return (
    <div ref={box} className="relative h-[430px] w-[212px] rounded-[30px] border-[6px] border-ink bg-white shadow-xl md:h-[460px] md:w-[226px]" aria-hidden>
      <div className="absolute left-1/2 top-1 z-30 h-1.5 w-12 -translate-x-1/2 rounded-full bg-ink/90" />
      <div className="relative h-full w-full overflow-hidden rounded-[22px] bg-white text-[10px] leading-tight text-ink">
        <div className="flex h-9 items-end justify-between border-b border-line px-3 pb-1.5">
          <span className="text-[11px] font-bold">Buy<span className="text-brand">Digital</span></span>
          <span className="relative"><ShoppingCart className="h-3.5 w-3.5" />{inCart && <span key="badge" className="animate-pop absolute -right-1.5 -top-1.5 grid h-3 w-3 place-items-center rounded-full bg-brand text-[8px] font-bold text-white">1</span>}</span>
        </div>

        <div key={f.scene} className="animate-fade-up absolute inset-x-0 bottom-0 top-9">
          {f.scene === "home" && (
            <div className="p-2.5">
              <p className="text-[10px] font-semibold">{t("popular")}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }, (_, n) => items[n]).map((p, n) => (
                  <div key={n} className={`animate-pop rounded-xl border p-1.5 transition duration-200 ${n === 0 && f.tap ? "scale-95 border-brand ring-2 ring-brand/40" : "border-line"}`} style={{ animationDelay: `${n * 90}ms` }}>
                    <div className="grid h-[52px] place-items-center rounded-lg bg-soft"><Thumb p={p} className="h-full w-full p-1 text-base" /></div>
                    <div className="mt-1 truncate font-semibold">{p ? p.name : <Bar w="w-14" />}</div>
                    <div className="mt-0.5 text-[9px] text-mute">{p ? rm(fromPrice(p)) : <Bar w="w-9" />}</div>
                    <div className="mt-1 rounded-md bg-brand py-1 text-center text-[8px] font-semibold text-white">{t("buyNow")}</div>
                  </div>))}
              </div>
            </div>)}

          {f.scene === "product" && (
            <div className="p-2.5">
              <div className="grid h-[96px] place-items-center rounded-xl bg-soft"><Thumb p={main} className="h-full w-full p-2 text-3xl" /></div>
              <p className="mt-2 text-[12px] font-bold">{main ? main.name : <Bar w="w-24" />}</p>
              <Price v={price} cls="mt-0.5 block text-[12px] font-bold" />
              {opt.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{opt.map((v, n) => <span key={v.id} className={`rounded-md border px-1.5 py-0.5 text-[9px] ${n === 0 ? "border-brand bg-brand/5 text-brand" : "border-line"}`}>{v.label}</span>)}</div>}
              <div className="mt-2 space-y-1"><Bar w="w-full" /><Bar w="w-4/5" /></div>
              <div className="absolute inset-x-2.5 bottom-2.5 flex gap-1.5">
                <span className="flex-1 rounded-lg border border-line py-1.5 text-center text-[9px] font-semibold">{t("addToCart")}</span>
                <span className={`flex-1 rounded-lg bg-brand py-1.5 text-center text-[9px] font-semibold text-white transition duration-200 ${f.tap ? "scale-95" : "animate-ring"}`}>{t("buyNow")}</span>
              </div>
            </div>)}

          {f.scene === "cart" && (
            <div className="p-2.5">
              <p className="text-[12px] font-bold">{t("cart")}</p>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-line p-1.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-soft"><Thumb p={main} className="h-full w-full p-0.5 text-sm" /></div>
                <div className="min-w-0 flex-1"><p className="truncate font-semibold">{main ? main.name : <Bar w="w-16" />}</p><p className="text-[9px] text-mute">{opt[0]?.label ?? ""} × 1</p></div>
                <Price v={price} cls="font-semibold" />
              </div>
              <div className="mt-3 space-y-1.5 text-[10px]">
                <p className="flex justify-between text-mute"><span>{t("subtotal")}</span><Price v={price} /></p>
                <p className="flex justify-between border-t border-line pt-1.5 text-[12px] font-bold"><span>{t("total")}</span><Price v={price} /></p>
              </div>
              <div className={`absolute inset-x-2.5 bottom-2.5 rounded-lg bg-brand py-2 text-center text-[10px] font-semibold text-white transition duration-200 ${f.tap ? "scale-95" : "animate-ring"}`}>{t("pay")}</div>
            </div>)}

          {f.scene === "paying" && (
            <div className="grid h-full place-items-center p-4 text-center">
              <div><span className="animate-ring mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand/10 text-brand"><Lock className="h-5 w-5" /></span>
                <p className="mt-3 text-[11px] font-semibold">{t("trust2")}</p><p className="mt-0.5 text-[9px] text-mute">{t("payMethods")}</p>
                <div className="mx-auto mt-4 h-1.5 w-28 overflow-hidden rounded-full bg-line"><div className="animate-bar h-full rounded-full bg-brand" /></div></div>
            </div>)}

          {f.scene === "success" && (
            <div className="relative grid h-full place-items-center overflow-hidden p-4 text-center">
              {[8, 22, 36, 50, 64, 78, 90, 15, 70, 44].map((l, n) => <span key={n} className="animate-fall absolute top-6 h-1.5 w-1.5 rounded-sm" style={{ left: `${l}%`, background: ["#E62117", "#079669", "#171717", "#F59E0B"][n % 4], animationDelay: `${(n % 5) * 120}ms` }} />)}
              <div><svg viewBox="0 0 52 52" className="animate-pop mx-auto h-16 w-16"><circle cx="26" cy="26" r="24" fill="#079669" /><path d="M15 27l8 8 14-16" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="30" strokeDashoffset="30" className="animate-draw" /></svg>
                <p className="animate-fade-up mt-3 text-[12px] font-bold text-ok [animation-delay:300ms]">{t("payOk")}</p></div>
            </div>)}

          {f.scene === "delivered" && (
            <div className="p-2.5">
              <div className="animate-slide-down rounded-xl border border-line bg-white p-2 shadow-md">
                <div className="flex items-center gap-1.5"><span className="grid h-5 w-5 place-items-center rounded-md bg-brand text-white"><Mail className="h-3 w-3" /></span><span className="font-bold">BuyDigital</span><span className="ml-auto text-[8px] text-mute">now</span></div>
                <p className="mt-1.5 text-[10px] font-bold">{t("orderReady")}</p><p className="mt-0.5 text-[9px] text-mute">{t("emailBody")}</p>
                <span className="mt-1.5 inline-block rounded-md bg-brand px-2 py-1 text-[8px] font-semibold text-white">{t("orderDelivered")}</span>
              </div>
              <ol className="mt-4 space-y-3 border-l border-line pl-3">
                {[t("payVerified"), t("orderDelivered")].map((x, n) => (
                  <li key={x} className="animate-slide-in relative flex items-center gap-1.5" style={{ animationDelay: `${700 + n * 700}ms` }}>
                    <span className="absolute -left-[19px] grid h-3.5 w-3.5 place-items-center rounded-full bg-ok text-white"><Check className="h-2.5 w-2.5" /></span><span className="font-semibold">{x}</span></li>))}
              </ol>
            </div>)}
        </div>

        <div className="pointer-events-none absolute z-20 transition-all duration-700 ease-in-out" style={{ left: `${f.x}%`, top: `${f.y}%`, opacity: f.hide || reduced ? 0 : 1 }}>
          <div className="-ml-2.5 -mt-2.5 h-5 w-5 rounded-full border-2 border-white bg-ink/80 shadow-md" />
          {f.tap && <span key={i} className="animate-ripple absolute -left-4 -top-4 h-8 w-8 rounded-full border-2 border-brand" />}
        </div>
      </div>
    </div>
  );
}
