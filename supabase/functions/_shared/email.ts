// Sends through Resend when RESEND_API_KEY is set; otherwise logs and returns false (nothing is pretended).
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function template(title: string, body: string, ctaUrl?: string, ctaLabel = "View order") {
  return `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#171717">
  <div style="font-weight:700;font-size:20px">Buy<span style="color:#E62117">Digital</span></div>
  <h2 style="margin:24px 0 8px">${esc(title)}</h2><p style="color:#6B7280;line-height:1.6">${esc(body)}</p>
  ${ctaUrl ? `<p><a href="${esc(ctaUrl)}" style="display:inline-block;background:#E62117;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-weight:600">${esc(ctaLabel)}</a></p>` : ""}
  <p style="color:#6B7280;font-size:12px;margin-top:32px">BuyDigital · buydigital.my</p></div>`;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) { console.warn("RESEND_API_KEY not set; email not sent"); return false; }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM") ?? "BuyDigital <support@buydigital.my>", to, subject, html }),
  });
  if (!r.ok) console.error("resend failed", r.status);
  return r.ok;
}
