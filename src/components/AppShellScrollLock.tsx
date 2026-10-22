"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Keeps the document + PWA shell from scrolling underneath fixed chrome
 * (FAB / bottom nav). Nested h-dvh pages inside a scrollable shell can
 * otherwise jump up after focus, keyboard, or iOS toolbar changes —
 * header disappears while the FAB stays put.
 */
export default function AppShellScrollLock() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("app-shell-lock");
    return () => {
      root.classList.remove("app-shell-lock");
    };
  }, []);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>("[data-app-shell]");
    if (shell) shell.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>("[data-app-shell]");
    if (!shell) return;

    const reset = () => {
      if (shell.scrollTop !== 0) shell.scrollTop = 0;
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      // Inputs inside sheets/modals may ask the browser to scroll ancestors.
      window.setTimeout(reset, 0);
    };

    window.addEventListener("orientationchange", reset);
    window.visualViewport?.addEventListener("resize", reset);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("orientationchange", reset);
      window.visualViewport?.removeEventListener("resize", reset);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return null;
}
