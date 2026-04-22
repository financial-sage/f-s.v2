"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      key={pathname}
      className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out fill-mode-both h-full"
    >
      {children}
    </div>
  );
}
