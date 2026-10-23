import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { PwaStatus } from "./PwaStatus";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export function PageFallback() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center" role="status" aria-label="Loading">
      <span className="h-px w-24 animate-pulse bg-gold" />
    </div>
  );
}

export function PublicLayout({ chrome = true }: { chrome?: boolean }) {
  return (
    <>
      <a href="#main" className="sr-only z-[70] rounded bg-gold px-4 py-2 text-ink-950 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <ScrollManager />
      {chrome && <SiteHeader />}
      <main id="main" tabIndex={-1} className="outline-none">
        <Suspense fallback={<PageFallback />}>
          <Outlet />
        </Suspense>
      </main>
      {chrome && <SiteFooter />}
      <PwaStatus />
    </>
  );
}
