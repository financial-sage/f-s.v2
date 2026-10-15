"use client";

import { useEffect } from "react";
import type { FamilyFund } from "@/lib/funds";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useFundsStore } from "@/store/useFundsStore";

/**
 * Primes expense + funds caches once so tab navigations stay instant.
 * Safe to mount in the PWA layout and again on individual pages.
 */
export default function StoreHydrator({
  userId,
  initialFunds,
}: {
  userId?: string;
  initialFunds?: FamilyFund[];
}) {
  const isHydrated = useExpenseStore((s) => s.isHydrated);
  const fetchData = useExpenseStore((s) => s.fetchData);
  const loadFunds = useFundsStore((s) => s.load);

  useEffect(() => {
    if (initialFunds?.length) {
      useFundsStore.getState().setFunds(initialFunds);
    }
  }, [initialFunds]);

  useEffect(() => {
    if (!isHydrated) {
      void fetchData(userId);
    }
  }, [isHydrated, fetchData, userId]);

  useEffect(() => {
    void loadFunds();
  }, [loadFunds]);

  return null;
}
