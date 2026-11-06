import { useCallback, useEffect, useState } from "react";
import {
  BUDGET_CHANGE_EVENT,
  budgetStorageKey,
  getMonthKey,
  safeParseBudgetStore,
  shiftMonthKey,
  type BudgetLimits,
} from "@/lib/budget";

function readBudgetStore(familyId: string): Record<string, BudgetLimits> {
  if (typeof window === "undefined" || !familyId) return {};
  return safeParseBudgetStore(
    window.localStorage.getItem(budgetStorageKey(familyId)),
  );
}

export function useBudget(familyId: string) {
  const [store, setStore] = useState<Record<string, BudgetLimits>>({});

  useEffect(() => {
    const reload = () => setStore(readBudgetStore(familyId));
    reload();

    const onStorage = (event: StorageEvent) => {
      if (
        event.key === budgetStorageKey(familyId) ||
        event.key === null
      ) {
        reload();
      }
    };

    window.addEventListener(BUDGET_CHANGE_EVENT, reload);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(BUDGET_CHANGE_EVENT, reload);
      window.removeEventListener("storage", onStorage);
    };
  }, [familyId]);

  const persist = useCallback(
    (next: Record<string, BudgetLimits>) => {
      if (!familyId) return;
      setStore(next);
      window.localStorage.setItem(
        budgetStorageKey(familyId),
        JSON.stringify(next),
      );
      window.dispatchEvent(new Event(BUDGET_CHANGE_EVENT));
    },
    [familyId],
  );

  function getLimits(monthKey: string): BudgetLimits {
    return store[monthKey] ?? {};
  }

  function setSegmentLimit(monthKey: string, segmentId: string, amount: number) {
    const current = getLimits(monthKey);
    const nextLimits = { ...current };

    if (amount <= 0) {
      delete nextLimits[segmentId];
    } else {
      nextLimits[segmentId] = amount;
    }

    persist({
      ...store,
      [monthKey]: nextLimits,
    });
  }

  /** Replace all limits for a month in one write (SimpleBudgetSetup). */
  function setMonthLimits(monthKey: string, limits: BudgetLimits) {
    const cleaned: BudgetLimits = {};
    for (const [id, amount] of Object.entries(limits)) {
      const n = Number(amount);
      if (Number.isFinite(n) && n > 0) {
        cleaned[id] = Math.round(n * 100) / 100;
      }
    }
    persist({
      ...store,
      [monthKey]: cleaned,
    });
  }

  /** @deprecated Use setSegmentLimit */
  function setCategoryLimit(
    monthKey: string,
    categoryId: string,
    amount: number,
  ) {
    setSegmentLimit(monthKey, categoryId, amount);
  }

  function duplicateFromPreviousMonth(monthKey: string) {
    const previousKey = shiftMonthKey(monthKey, -1);
    const previousLimits = getLimits(previousKey);
    if (Object.keys(previousLimits).length === 0) return false;

    persist({
      ...store,
      [monthKey]: { ...previousLimits },
    });
    return true;
  }

  function hasAnyLimit(monthKey: string) {
    return Object.keys(getLimits(monthKey)).length > 0;
  }

  return {
    getLimits,
    setSegmentLimit,
    setMonthLimits,
    setCategoryLimit,
    duplicateFromPreviousMonth,
    hasAnyLimit,
    currentMonthKey: getMonthKey(),
  };
}
