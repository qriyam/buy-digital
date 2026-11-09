import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type Ctx = { user: User | null; loading: boolean; isAdmin: boolean; verified: boolean;
  signIn: (e: string, p: string) => Promise<string | null>;
  signUp: (name: string, e: string, p: string) => Promise<string | null>;
  google: () => Promise<string | null>;
  reset: (e: string) => Promise<string | null>;
  setPassword: (p: string) => Promise<string | null>;
  signOut: () => Promise<void> };
const A = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [isAdmin, setAdmin] = useState(false);
  useEffect(() => {
    if (!supabase) return;
    const ready = async (u: User | null) => {
      // Profile creation is best-effort: a temporary RPC/schema issue must not
      // leave the entire storefront stuck on its loading state.
      if (u) await Promise.resolve(supabase!.rpc("ensure_profile")).catch(() => undefined);
      setUser(u);
    };   // creates this site's profile on first sign-in
    supabase.auth.getSession().then(async ({ data }) => {
      try { await ready(data.session?.user ?? null); }
      finally { setLoading(false); }
    }).catch(() => setLoading(false));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { const u = s?.user ?? null; setTimeout(() => { void ready(u); }, 0); });
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {   // UI hint only. Every admin action is re-checked on the server.
    if (!supabase || !user) { setAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => setAdmin(!!data?.length));
  }, [user]);
  const off = "Accounts are not connected yet (backend not configured).";
  const msg = (e: { message: string } | null) => e?.message ?? null;
  const value: Ctx = {
    user, loading, isAdmin, verified: !!user?.email_confirmed_at,
    signIn: async (email, password) => supabase ? msg((await supabase.auth.signInWithPassword({ email, password })).error) : off,
    signUp: async (full_name, email, password) => supabase ? msg((await supabase.auth.signUp({ email, password, options: { data: { full_name }, emailRedirectTo: `${location.origin}/account` } })).error) : off,
    google: async () => supabase ? msg((await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/account` } })).error) : off,
    reset: async (email) => supabase ? msg((await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` })).error) : off,
    setPassword: async (password) => supabase ? msg((await supabase.auth.updateUser({ password })).error) : off,
    signOut: async () => { await supabase?.auth.signOut(); },
  };
  return <A.Provider value={value}>{children}</A.Provider>;
}
export const useAuth = () => { const c = useContext(A); if (!c) throw new Error("AuthProvider missing"); return c; };
