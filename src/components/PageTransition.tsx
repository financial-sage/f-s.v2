"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { perfLog, perfNow } from "@/lib/perf";

/**
 * Soft fade on route change without remounting children.
 * Remounting via key={pathname} was restarting fetches, realtime, and store effects.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [animating, setAnimating] = useState(false);
  const navStartRef = useRef<number | null>(null);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      const started = navStartRef.current ?? perfNow();
      perfLog(
        "nav.paint",
        { ms: perfNow() - started, from: prevPathRef.current, to: pathname },
        "client"
      );
      prevPathRef.current = pathname;
      navStartRef.current = null;
    }
    setAnimating(true);
    const id = window.setTimeout(() => setAnimating(false), 220);
    return () => window.clearTimeout(id);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || !anchor.href) return;
      try {
        const url = new URL(anchor.href, window.location.origin);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;
        navStartRef.current = perfNow();
      } catch {
        // ignore
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col ${
        animating ? "animate-in fade-in duration-200 ease-out fill-mode-both" : ""
      }`}
    >
      {children}
    </div>
  );
}
