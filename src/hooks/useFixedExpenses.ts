"use client";

import { useEffect } from "react";
import { useFixedExpensesStore } from "@/store/useFixedExpensesStore";
import { getMonthKey } from "@/lib/budget";

export function useFixedExpenses(monthKey: string = getMonthKey()) {
  const snapshot = useFixedExpensesStore((s) => s.snapshot);
  const totals = useFixedExpensesStore((s) => s.totals);
  const isLoading = useFixedExpensesStore((s) => s.isLoading);
  const isSaving = useFixedExpensesStore((s) => s.isSaving);
  const error = useFixedExpensesStore((s) => s.error);
  const loadMonth = useFixedExpensesStore((s) => s.loadMonth);
  const createTemplate = useFixedExpensesStore((s) => s.createTemplate);
  const updateTemplate = useFixedExpensesStore((s) => s.updateTemplate);
  const deactivateTemplate = useFixedExpensesStore((s) => s.deactivateTemplate);
  const deposit = useFixedExpensesStore((s) => s.deposit);
  const markPaid = useFixedExpensesStore((s) => s.markPaid);
  const updatePaid = useFixedExpensesStore((s) => s.updatePaid);
  const unmarkPaid = useFixedExpensesStore((s) => s.unmarkPaid);

  useEffect(() => {
    void loadMonth(monthKey);
  }, [monthKey, loadMonth]);

  return {
    totals,
    items: snapshot?.items ?? [],
    isLoading,
    isSaving,
    error,
    loadMonth,
    createTemplate,
    updateTemplate,
    deactivateTemplate,
    deposit,
    markPaid,
    updatePaid,
    unmarkPaid,
  };
}
