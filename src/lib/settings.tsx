import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";

type S = Record<string, string>;
const C = createContext<S>({});
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<S>({});
  useEffect(() => {
    supabase?.from("website_settings").select("key,value").eq("is_public", true).then(({ data }) => {
      const o: S = {}; (data ?? []).forEach((r: any) => { o[r.key] = typeof r.value === "string" ? r.value : ""; }); setS(o);
    });
  }, []);
  useEffect(() => {
    if (!s.site_favicon) return;
    let l = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!l) { l = document.createElement("link"); l.rel = "icon"; document.head.appendChild(l); }
    l.href = s.site_favicon;
  }, [s.site_favicon]);
  return <C.Provider value={s}>{children}</C.Provider>;
}
export const useSettings = () => useContext(C);
