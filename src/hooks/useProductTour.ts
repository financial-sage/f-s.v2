"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ensureFirstRunForUser,
  isTourDone,
  markTourDone,
  type TourId,
} from "@/lib/firstRun";
import type { ProductTourStep } from "@/components/ProductTour";

export function useProductTour(
  userId: string | undefined | null,
  tourId: TourId,
  steps: ProductTourStep[],
  options?: { enabled?: boolean; hasFamily?: boolean }
) {
  const enabled = options?.enabled !== false;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled || !userId || steps.length === 0) return;
    ensureFirstRunForUser(userId, { hasFamily: options?.hasFamily ?? true });
    if (isTourDone(userId, tourId)) return;

    const t = window.setTimeout(() => setOpen(true), 450);
    return () => window.clearTimeout(t);
  }, [enabled, userId, tourId, steps.length, options?.hasFamily]);

  const close = useCallback(
    (_reason: "skip" | "done") => {
      if (userId) markTourDone(userId, tourId);
      setOpen(false);
    },
    [userId, tourId]
  );

  return { open, steps, close };
}
