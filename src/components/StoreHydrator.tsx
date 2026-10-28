"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { FamilyFund } from "@/lib/funds";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useCategoriesStore } from "@/store/useCategoriesStore";
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
  const pathname = usePathname();
  const isHydrated = useExpenseStore((s) => s.isHydrated);
  const expenseCount = useExpenseStore((s) => s.expenses.length);
  const isFetching = useExpenseStore((s) => s.isFetching);
  const fetchData = useExpenseStore((s) => s.fetchData);
  const loadFunds = useFundsStore((s) => s.load);
  const loadAccounts = useAccountsStore((s) => s.load);
  const loadCategories = useCategoriesStore((s) => s.load);
  const lastEmptyFetchPath = useRef<string | null>(null);

  useEffect(() => {
    if (initialFunds?.length) {
      useFundsStore.getState().setFunds(initialFunds);
    }
  }, [initialFunds]);

  useEffect(() => {
    if (!isHydrated) {
      void fetchData(userId);
      return;
    }
    // Self-heal on nav: hydrated-but-empty is usually a failed wipe.
    // History relies on the store (SSR passes []), so recovery matters here.
    if (expenseCount === 0 && !isFetching && lastEmptyFetchPath.current !== pathname) {
      lastEmptyFetchPath.current = pathname;
      void fetchData(userId);
    }
  }, [isHydrated, expenseCount, isFetching, fetchData, userId, pathname]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const state = useExpenseStore.getState();
      if (state.isHydrated && state.expenses.length === 0 && !state.isFetching) {
        void fetchData(userId);
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchData, userId]);

  useEffect(() => {
    // Avoid server-action 500s while the user still has no family (post-wipe / onboarding).
    if (
      pathname?.startsWith("/onboarding") ||
      pathname?.startsWith("/login") ||
      pathname?.startsWith("/register") ||
      pathname?.startsWith("/forgot-password")
    ) {
      return;
    }
    void loadFunds();
    void loadAccounts();
    void loadCategories();
  }, [loadFunds, loadAccounts, loadCategories, pathname]);

  return null;
}
