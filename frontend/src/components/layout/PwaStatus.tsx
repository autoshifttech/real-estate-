import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { useOnline } from "../../lib/hooks";
import { flushOutbox } from "../../lib/visitor";

/** Offline indicator + "new version available" prompt. */
export function PwaStatus() {
  const online = useOnline();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: false });

  useEffect(() => {
    if (online) void flushOutbox();
  }, [online]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      {!online && (
        <p className="pointer-events-auto rounded-full border border-line bg-ink-900/95 px-5 py-2.5 text-sm text-stone-300 shadow-2xl backdrop-blur">
          You're offline. Saved residences and imagery are still available.
        </p>
      )}
      {needRefresh && (
        <div className="pointer-events-auto flex items-center gap-4 rounded-full border border-line bg-ink-900/95 py-2 pl-5 pr-2 text-sm shadow-2xl backdrop-blur">
          <span className="text-stone-300">A new version is ready.</span>
          <button className="rounded-full bg-gold px-4 py-2 text-ink-950" onClick={() => void updateServiceWorker(true)}>
            Refresh
          </button>
          <button className="px-2 py-2 text-stone-400" aria-label="Dismiss" onClick={() => setNeedRefresh(false)}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
