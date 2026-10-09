"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    setAnimating(true);
  }, [pathname]);

  return (
    <div
      key={pathname}
      onAnimationEnd={() => setAnimating(false)}
      className={`h-full ${animating ? "animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out fill-mode-both" : ""}`}
    >
      {children}
    </div>
  );
}
