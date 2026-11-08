import { createClient } from "npm:@supabase/supabase-js@2.45.4";
// Service-role client: bypasses RLS. Only ever used inside Edge Functions, never sent to a browser.
export const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
