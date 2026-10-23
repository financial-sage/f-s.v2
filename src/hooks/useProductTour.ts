"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  options?: {
    enabled?: boolean;
    hasFamily?: boolean;
    /** When false, only opens via `start()` (contextual tours). Default true. */
    autoStart?: boolean;
  }
) {
  const enabled = options?.enabled !== false;
  const autoStart = options?.autoStart !== false;
  const hasFamily = options?.hasFamily ?? true;
  const [open, setOpen] = useState(false);
  const startTimerRef = useRef<number | null>(null);

  const clearStartTimer = useCallback(() => {
    if (startTimerRef.current != null) {
      window.clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
  }, []);

  const tryOpen = useCallback(
    (delayMs = 450) => {
      if (!enabled || !userId || steps.length === 0) return false;
      ensureFirstRunForUser(userId, { hasFamily });
      if (isTourDone(userId, tourId)) return false;
      clearStartTimer();
      startTimerRef.current = window.setTimeout(() => {
        startTimerRef.current = null;
        setOpen(true);
      }, delayMs);
      return true;
    },
    [enabled, userId, steps.length, hasFamily, tourId, clearStartTimer]
  );

  useEffect(() => {
    if (!autoStart) return;
    tryOpen(450);
    return clearStartTimer;
  }, [autoStart, tryOpen, clearStartTimer]);

  const start = useCallback(
    (delayMs = 450) => tryOpen(delayMs),
    [tryOpen]
  );

  const close = useCallback(
    (_reason: "skip" | "done") => {
      clearStartTimer();
      if (userId) markTourDone(userId, tourId);
      setOpen(false);
    },
    [userId, tourId, clearStartTimer]
  );

  return { open, steps, close, start };
}
