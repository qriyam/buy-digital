export class HttpError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

const allowed = () => (Deno.env.get("BUYDIGITAL_ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const h: Record<string, string> = {
    "Vary": "Origin", "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Cache-Control": "no-store",
  };
  if (allowed().includes(origin)) h["Access-Control-Allow-Origin"] = origin;
  return h;
}

export async function readJson<T>(req: Request, maxBytes = 200_000): Promise<T> {
  const raw = await req.text();
  if (raw.length > maxBytes) throw new HttpError(413, "payload_too_large");
  try { return JSON.parse(raw) as T; } catch { throw new HttpError(400, "invalid_json"); }
}

export function serve(handler: (req: Request) => Promise<unknown>) {
  Deno.serve(async (req) => {
    const base = cors(req);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: base });
    if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: base });
    try {
      const body = await handler(req);
      return new Response(JSON.stringify(body ?? { ok: true }), { status: 200, headers: { ...base, "Content-Type": "application/json" } });
    } catch (e) {
      if (e instanceof HttpError) return new Response(JSON.stringify({ error: e.code }), { status: e.status, headers: { ...base, "Content-Type": "application/json" } });
      console.error(e); // details stay in server logs
      return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers: { ...base, "Content-Type": "application/json" } });
    }
  });
}
