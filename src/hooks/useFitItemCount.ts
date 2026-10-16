"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * How many fixed-height rows fit in a measured container (no nested scroll).
 * Used by dashboard recent lists so short phones (nav bars / PWA chrome) stay usable.
 */
export function useFitItemCount(
  containerRef: RefObject<HTMLElement | null>,
  {
    maxItems,
    itemHeightPx,
    minItems = 1,
  }: {
    maxItems: number;
    itemHeightPx: number;
    minItems?: number;
  }
) {
  const [visibleCount, setVisibleCount] = useState(maxItems);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || itemHeightPx <= 0) return;

    const update = (height: number) => {
      if (height < itemHeightPx * 0.55) {
        setVisibleCount(0);
        return;
      }
      const fitted = Math.floor(height / itemHeightPx);
      setVisibleCount(Math.max(minItems, Math.min(maxItems, fitted)));
    };

    update(el.getBoundingClientRect().height);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      update(entry.contentRect.height);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, maxItems, itemHeightPx, minItems]);

  return visibleCount;
}
