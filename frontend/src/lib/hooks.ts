import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api } from "./api";

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const cache = new Map<string, unknown>();

/** Minimal data hook: cached by key, abortable, with manual reload. */
export function useApi<T>(path: string | null, options: { auth?: boolean; query?: NonNullable<Parameters<typeof api>[1]>["query"] } = {}) {
  const key = path ? `${path}?${JSON.stringify(options.query ?? {})}` : null;
  const [data, setData] = useState<T | undefined>(() => (key ? (cache.get(key) as T | undefined) : undefined));
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(!!key && !cache.has(key));
  const [tick, setTick] = useState(0);
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    if (!path || !key) return;
    const ctrl = new AbortController();
    setLoading(true);
    api<T>(path, { auth: optsRef.current.auth, query: optsRef.current.query, signal: ctrl.signal })
      .then((d) => {
        cache.set(key, d);
        setData(d);
        setError(null);
      })
      .catch((e: unknown) => {
        if ((e as Error).name !== "AbortError") setError(e as Error);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [path, key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}

export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}
