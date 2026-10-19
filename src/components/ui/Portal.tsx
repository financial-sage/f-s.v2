"use client";

import * as React from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into document.body so overlays escape page stacking
 * contexts (e.g. layout <main className="relative z-0">) and sit above
 * chrome like BottomNav (z-50).
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(children, document.body);
}
