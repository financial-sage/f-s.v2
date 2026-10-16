"use client";

import { useEffect } from "react";
import type { FamilyFund } from "@/lib/funds";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useFundsStore } from "@/store/useFundsStore";

/**
 * Primes expense + funds + accounts caches once so tab navigations and the
 * expense sheet stay instant. Safe to mount in the PWA layout and again on pages.
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
  const loadAccounts = useAccountsStore((s) => s.load);

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
    void loadAccounts();
  }, [loadFunds, loadAccounts]);

  return null;
}
