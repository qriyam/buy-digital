import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
// null when env vars are missing: the store then shows "being set up" and sign-in is disabled.
export const supabase = url && key ? createClient(url, key, { db: { schema: "buydigital" } }) : null;
export const live = supabase !== null;

export async function callFn<T>(name: string, body: unknown): Promise<T> {
  if (!supabase) throw new Error("backend_not_configured");
  const { data, error } = await supabase.functions.invoke(name, { body: body as Record<string, unknown> });
  if (error) {
    let code = "server_error";
    try { code = (await (error as any).context.json()).error ?? code; } catch { /* keep default */ }
    throw new Error(code);
  }
  return data as T;
}
