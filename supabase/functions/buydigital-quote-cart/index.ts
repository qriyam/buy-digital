// Price preview for the cart page: same rules as checkout, creates nothing.
import { serve, readJson } from "../_shared/http.ts";
import { authed, profileFor } from "../_shared/auth.ts";
import { parseCart, priceCart, fmt, type Body } from "../_shared/pricing.ts";

serve(async (req) => {
  const me = await authed(req);
  const profile = await profileFor(me.uid);
  const body = await readJson<Body>(req, 20_000);
  const p = await priceCart(profile.id, body, parseCart(body));
  return { subtotal: fmt(p.subtotal), discount: fmt(p.discount), total: fmt(p.total) };
});
