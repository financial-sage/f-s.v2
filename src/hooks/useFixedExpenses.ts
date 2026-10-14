"use client";

import { useEffect, useState } from "react";
import {
  fixedExpensesStore,
  type FixedExpensesState,
} from "@/lib/fixed-expenses/fixedExpensesStore";
import type { FixedExpenseDerivedTotals } from "@/lib/fixed-expenses/types";
import { getMonthKey } from "@/lib/budget";

const emptyTotals: FixedExpenseDerivedTotals = {
  sumBase: 0,
  sumReal: 0,
  budgetTotal: 0,
  pocketDeposits: 0,
  pocketBalance: 0,
  remaining: 0,
  variance: 0,
  paidCount: 0,
  totalCount: 0,
};

export function useFixedExpenses(monthKey: string = getMonthKey()) {
  const [state, setState] = useState<FixedExpensesState>(fixedExpensesStore.getState());
  const [totals, setTotals] = useState<FixedExpenseDerivedTotals>(fixedExpensesStore.getTotals());

  useEffect(() => {
    const unsubscribe = fixedExpensesStore.subscribe(({ state: nextState, totals: nextTotals }) => {
      setState(nextState);
      setTotals(nextTotals);
    });

    void fixedExpensesStore.loadMonth(monthKey);

    return unsubscribe;
  }, [monthKey]);

  return {
    state,
    totals: totals ?? emptyTotals,
    items: state.snapshot?.items ?? [],
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    error: state.error,
    loadMonth: fixedExpensesStore.loadMonth.bind(fixedExpensesStore),
    createTemplate: fixedExpensesStore.createTemplate.bind(fixedExpensesStore),
    updateTemplate: fixedExpensesStore.updateTemplate.bind(fixedExpensesStore),
    deactivateTemplate: fixedExpensesStore.deactivateTemplate.bind(fixedExpensesStore),
    deposit: fixedExpensesStore.deposit.bind(fixedExpensesStore),
    markPaid: fixedExpensesStore.markPaid.bind(fixedExpensesStore),
    unmarkPaid: fixedExpensesStore.unmarkPaid.bind(fixedExpensesStore),
  };
}
