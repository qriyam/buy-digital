// Writes public/sitemap.xml with static pages plus every active product and category. Runs before `npm run build`.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const env = { ...process.env };
if (existsSync(".env")) for (const l of readFileSync(".env", "utf8").split("\n")) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !env[m[1]]) env[m[1]] = m[2].trim(); }
const SITE = "https://buydigital.my";
const urls = ["/", "/products", "/categories", "/about", "/contact", "/faq", "/shipping-and-delivery", "/privacy-policy", "/terms-and-conditions", "/refund-policy"];
const base = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_ANON_KEY;
if (base && key) {
  const get = async (q) => { try { const r = await fetch(`${base}/rest/v1/${q}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } }); return r.ok ? await r.json() : []; } catch { return []; } };
  (await get("products?select=slug&is_active=eq.true&archived_at=is.null")).forEach((p) => urls.push(`/products/${p.slug}`));
  (await get("categories?select=slug&is_active=eq.true")).forEach((c) => urls.push(`/categories/${c.slug}`));
}
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join("\n")}\n</urlset>\n`;
writeFileSync("public/sitemap.xml", xml); console.log(`sitemap: ${urls.length} urls`);
