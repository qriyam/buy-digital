import { useEffect } from "react";

const SITE = "https://buydigital.my";
function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.content = content;
}
// Sets title, description, canonical, Open Graph and optional JSON-LD for the current page.
export default function Seo({ title, description, path, image, jsonLd, noindex }: { title: string; description: string; path: string; image?: string; jsonLd?: object; noindex?: boolean }) {
  useEffect(() => {
    const full = title.includes("BuyDigital") ? title : `${title} | BuyDigital`;
    document.title = full;
    setMeta("name", "description", description.slice(0, 160));
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
    setMeta("property", "og:title", full); setMeta("property", "og:description", description.slice(0, 200));
    setMeta("property", "og:type", "website"); setMeta("property", "og:url", SITE + path); setMeta("property", "og:site_name", "BuyDigital");
    if (image) setMeta("property", "og:image", image);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = SITE + path;
    let ld = document.getElementById("ld-json");
    if (jsonLd) { if (!ld) { ld = document.createElement("script"); ld.id = "ld-json"; (ld as HTMLScriptElement).type = "application/ld+json"; document.head.appendChild(ld); } ld.textContent = JSON.stringify(jsonLd); }
    else ld?.remove();
    return () => { document.getElementById("ld-json")?.remove(); };
  }, [title, description, path, image, jsonLd, noindex]);
  return null;
}
