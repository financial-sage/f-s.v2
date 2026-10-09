"use client";

import { useEffect } from "react";
import { useExpenseStore } from "@/store/useExpenseStore";

/**
 * Mounts silently in both Dashboard and History pages.
 * Primes the Zustand store on first render so subsequent navigations
 * between pages are instant (data already cached).
 */
export default function StoreHydrator({ userId }: { userId: string }) {
  const isHydrated = useExpenseStore((s) => s.isHydrated);
  const fetchData = useExpenseStore((s) => s.fetchData);

  useEffect(() => {
    if (!isHydrated) {
      fetchData(userId);
    }
  }, [isHydrated, fetchData, userId]);

  return null;
}
