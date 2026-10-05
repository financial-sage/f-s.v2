import { useCallback, useEffect, useState } from "react";
import {
  budgetStorageKey,
  getMonthKey,
  safeParseBudgetStore,
  shiftMonthKey,
  type BudgetLimits,
} from "@/lib/budget";

export function useBudget(familyId: string) {
  const [store, setStore] = useState<Record<string, BudgetLimits>>({});

  useEffect(() => {
    setStore(safeParseBudgetStore(window.localStorage.getItem(budgetStorageKey(familyId))));
  }, [familyId]);

  const persist = useCallback(
    (next: Record<string, BudgetLimits>) => {
      setStore(next);
      window.localStorage.setItem(budgetStorageKey(familyId), JSON.stringify(next));
    },
    [familyId],
  );

  function getLimits(monthKey: string): BudgetLimits {
    return store[monthKey] ?? {};
  }

  function setCategoryLimit(monthKey: string, categoryId: string, amount: number) {
    const current = getLimits(monthKey);
    const nextLimits = { ...current };

    if (amount <= 0) {
      delete nextLimits[categoryId];
    } else {
      nextLimits[categoryId] = amount;
    }

    persist({
      ...store,
      [monthKey]: nextLimits,
    });
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
    setCategoryLimit,
    duplicateFromPreviousMonth,
    hasAnyLimit,
    currentMonthKey: getMonthKey(),
  };
}
