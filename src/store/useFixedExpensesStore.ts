"use client";

import { create } from "zustand";
import {
  createFixedExpenseAction,
  deactivateFixedExpenseAction,
  depositToFixedExpensesFundAction,
  loadFixedExpensesMonthAction,
  markFixedExpensePaidAction,
  unmarkFixedExpensePaidAction,
  updateFixedExpenseAction,
  updateFixedExpensePaidAction,
} from "@/app/actions/fixedExpenses";
import type {
  FixedExpenseDerivedTotals,
  FixedExpenseMonthSnapshot,
} from "@/lib/fixed-expenses/types";
import type { FixedExpenseFrequency } from "@/lib/fixed-expenses/frequency";
import { getMonthKey } from "@/lib/budget";

export interface FixedExpensesState {
  monthKey: string;
  snapshot: FixedExpenseMonthSnapshot | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

const emptyTotals: FixedExpenseDerivedTotals = {
  sumBase: 0,
  sumReal: 0,
  budgetTotal: 0,
  monthlyCommitted: 0,
  pocketDeposits: 0,
  pocketBalance: 0,
  remaining: 0,
  variance: 0,
  paidCount: 0,
  totalCount: 0,
};

function computeTotals(snapshot: FixedExpenseMonthSnapshot | null): FixedExpenseDerivedTotals {
  const items = snapshot?.items ?? [];
  const sumBase = items.reduce((sum, item) => sum + Number(item.payment.base_value_snapshot || 0), 0);
  const sumReal = items.reduce((sum, item) => {
    if (item.payment.status !== "paid") return sum;
    return sum + Number(item.payment.real_value || 0);
  }, 0);
  const budgetTotal = Number(snapshot?.budgetTotal ?? sumBase);
  const monthlyCommitted = Number(snapshot?.monthlyCommitted ?? sumBase);
  const pocketDeposits = Number(snapshot?.pocketDeposits ?? 0);
  const pocketBalance = Number(snapshot?.pocketAvailable ?? 0);
  const paidCount = items.filter((item) => item.payment.status === "paid").length;

  return {
    sumBase: Math.round(sumBase * 100) / 100,
    sumReal: Math.round(sumReal * 100) / 100,
    budgetTotal: Math.round(budgetTotal * 100) / 100,
    monthlyCommitted: Math.round(monthlyCommitted * 100) / 100,
    pocketDeposits: Math.round(pocketDeposits * 100) / 100,
    pocketBalance: Math.round(pocketBalance * 100) / 100,
    remaining: Math.round(pocketBalance * 100) / 100,
    variance: Math.round((sumReal - sumBase) * 100) / 100,
    paidCount,
    totalCount: items.length,
  };
}

interface FixedExpensesStore extends FixedExpensesState {
  totals: FixedExpenseDerivedTotals;
  loadMonth: (monthKey: string, options?: { force?: boolean }) => Promise<void>;
  createTemplate: (input: {
    name: string;
    baseValue: number;
    dueDay?: number | null;
    frequency?: FixedExpenseFrequency;
    anchorMonth?: number | null;
  }) => Promise<void>;
  updateTemplate: (input: {
    id: string;
    name: string;
    baseValue: number;
    dueDay?: number | null;
    frequency?: FixedExpenseFrequency;
    anchorMonth?: number | null;
  }) => Promise<void>;
  deactivateTemplate: (id: string) => Promise<void>;
  deposit: (amount: number) => Promise<void>;
  markPaid: (paymentId: string, realValue: number, paidDate?: string) => Promise<void>;
  updatePaid: (paymentId: string, realValue: number, paidDate: string) => Promise<void>;
  unmarkPaid: (paymentId: string) => Promise<void>;
}

export const useFixedExpensesStore = create<FixedExpensesStore>((set, get) => ({
  monthKey: getMonthKey(),
  snapshot: null,
  isLoading: false,
  isSaving: false,
  error: null,
  totals: emptyTotals,

  loadMonth: async (monthKey, options) => {
    const current = get();
    if (
      !options?.force &&
      current.monthKey === monthKey &&
      current.snapshot &&
      !current.isLoading
    ) {
      return;
    }

    set({ monthKey, isLoading: true, error: null });
    try {
      const snapshot = await loadFixedExpensesMonthAction(monthKey);
      set({ snapshot, isLoading: false, error: null, totals: computeTotals(snapshot) });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "No se pudo cargar gastos fijos.",
      });
    }
  },

  createTemplate: async (input) => {
    set({ isSaving: true, error: null });
    try {
      const snapshot = await createFixedExpenseAction({
        ...input,
        monthKey: get().monthKey,
      });
      set({ snapshot, isSaving: false, error: null, totals: computeTotals(snapshot) });
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : "No se pudo crear el gasto fijo.",
      });
      throw err;
    }
  },

  updateTemplate: async (input) => {
    set({ isSaving: true, error: null });
    try {
      const snapshot = await updateFixedExpenseAction({
        ...input,
        monthKey: get().monthKey,
      });
      set({ snapshot, isSaving: false, error: null, totals: computeTotals(snapshot) });
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : "No se pudo actualizar el gasto fijo.",
      });
      throw err;
    }
  },

  deactivateTemplate: async (id) => {
    set({ isSaving: true, error: null });
    try {
      const snapshot = await deactivateFixedExpenseAction({
        id,
        monthKey: get().monthKey,
      });
      set({ snapshot, isSaving: false, error: null, totals: computeTotals(snapshot) });
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : "No se pudo archivar el gasto fijo.",
      });
      throw err;
    }
  },

  deposit: async (amount) => {
    set({ isSaving: true, error: null });
    try {
      const snapshot = await depositToFixedExpensesFundAction({
        amount,
        monthKey: get().monthKey,
      });
      set({ snapshot, isSaving: false, error: null, totals: computeTotals(snapshot) });
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : "No se pudo registrar el aporte.",
      });
      throw err;
    }
  },

  markPaid: async (paymentId, realValue, paidDate) => {
    set({ isSaving: true, error: null });
    try {
      const snapshot = await markFixedExpensePaidAction({
        paymentId,
        realValue,
        monthKey: get().monthKey,
        paidDate,
      });
      set({ snapshot, isSaving: false, error: null, totals: computeTotals(snapshot) });
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : "No se pudo marcar como pagado.",
      });
      throw err;
    }
  },

  updatePaid: async (paymentId, realValue, paidDate) => {
    set({ isSaving: true, error: null });
    try {
      const snapshot = await updateFixedExpensePaidAction({
        paymentId,
        realValue,
        paidDate,
        monthKey: get().monthKey,
      });
      set({ snapshot, isSaving: false, error: null, totals: computeTotals(snapshot) });
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : "No se pudo actualizar el pago.",
      });
      throw err;
    }
  },

  unmarkPaid: async (paymentId) => {
    set({ isSaving: true, error: null });
    try {
      const snapshot = await unmarkFixedExpensePaidAction({
        paymentId,
        monthKey: get().monthKey,
      });
      set({ snapshot, isSaving: false, error: null, totals: computeTotals(snapshot) });
    } catch (err) {
      set({
        isSaving: false,
        error: err instanceof Error ? err.message : "No se pudo deshacer el pago.",
      });
      throw err;
    }
  },
}));
