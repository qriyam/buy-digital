import { useCallback, useEffect, useState } from "react";
export function useFetch<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null), [error, setError] = useState<string | null>(null), [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => { setLoading(true); fn().then((d) => { setData(d); setError(null); }).catch((e) => setError(String(e?.message ?? e))).finally(() => setLoading(false)); }, deps);
  useEffect(run, [run]);
  return { data, error, loading, reload: run };
}
