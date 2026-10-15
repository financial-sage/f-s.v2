"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Soft fade on route change without remounting children.
 * Remounting via key={pathname} was restarting fetches, realtime, and store effects.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setAnimating(true);
    const id = window.setTimeout(() => setAnimating(false), 220);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return (
    <div
      className={`h-full ${
        animating ? "animate-in fade-in duration-200 ease-out fill-mode-both" : ""
      }`}
    >
      {children}
    </div>
  );
}
