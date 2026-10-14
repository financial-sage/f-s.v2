import { BehaviorSubject, combineLatest, map, type Observable } from "rxjs";
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
import { getMonthKey } from "@/lib/budget";

export interface FixedExpensesState {
  monthKey: string;
  snapshot: FixedExpenseMonthSnapshot | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

const initialState: FixedExpensesState = {
  monthKey: getMonthKey(),
  snapshot: null,
  isLoading: false,
  isSaving: false,
  error: null,
};

const state$ = new BehaviorSubject<FixedExpensesState>(initialState);

function patch(partial: Partial<FixedExpensesState>) {
  state$.next({ ...state$.value, ...partial });
}

function computeTotals(snapshot: FixedExpenseMonthSnapshot | null): FixedExpenseDerivedTotals {
  const items = snapshot?.items ?? [];
  const sumBase = items.reduce((sum, item) => sum + Number(item.payment.base_value_snapshot || 0), 0);
  const sumReal = items.reduce((sum, item) => {
    if (item.payment.status !== "paid") return sum;
    return sum + Number(item.payment.real_value || 0);
  }, 0);
  const budgetTotal = Number(snapshot?.budgetTotal ?? sumBase);
  const pocketDeposits = Number(snapshot?.pocketDeposits ?? 0);
  const pocketBalance = Number(snapshot?.pocketAvailable ?? 0);
  const paidCount = items.filter((item) => item.payment.status === "paid").length;

  return {
    sumBase: Math.round(sumBase * 100) / 100,
    sumReal: Math.round(sumReal * 100) / 100,
    budgetTotal: Math.round(budgetTotal * 100) / 100,
    pocketDeposits: Math.round(pocketDeposits * 100) / 100,
    pocketBalance: Math.round(pocketBalance * 100) / 100,
    remaining: Math.round(pocketBalance * 100) / 100,
    variance: Math.round((sumReal - sumBase) * 100) / 100,
    paidCount,
    totalCount: items.length,
  };
}

export const fixedExpensesState$: Observable<FixedExpensesState> = state$.asObservable();

export const fixedExpensesTotals$: Observable<FixedExpenseDerivedTotals> = state$.pipe(
  map((state) => computeTotals(state.snapshot))
);

export const fixedExpensesView$: Observable<{
  state: FixedExpensesState;
  totals: FixedExpenseDerivedTotals;
}> = combineLatest([fixedExpensesState$, fixedExpensesTotals$]).pipe(
  map(([state, totals]) => ({ state, totals }))
);

export const fixedExpensesStore = {
  getState() {
    return state$.value;
  },

  getTotals() {
    return computeTotals(state$.value.snapshot);
  },

  subscribe(listener: (value: { state: FixedExpensesState; totals: FixedExpenseDerivedTotals }) => void) {
    const subscription = fixedExpensesView$.subscribe(listener);
    return () => subscription.unsubscribe();
  },

  async loadMonth(monthKey: string, options?: { force?: boolean }) {
    const current = state$.value;
    if (
      !options?.force &&
      current.monthKey === monthKey &&
      current.snapshot &&
      !current.isLoading
    ) {
      return;
    }

    patch({ monthKey, isLoading: true, error: null });
    try {
      const snapshot = await loadFixedExpensesMonthAction(monthKey);
      patch({ snapshot, isLoading: false, error: null });
    } catch (err) {
      patch({
        isLoading: false,
        error: err instanceof Error ? err.message : "No se pudo cargar gastos fijos.",
      });
    }
  },

  async createTemplate(input: { name: string; baseValue: number; dueDay?: number | null }) {
    patch({ isSaving: true, error: null });
    try {
      const snapshot = await createFixedExpenseAction({
        ...input,
        monthKey: state$.value.monthKey,
      });
      patch({ snapshot, isSaving: false, error: null });
    } catch (err) {
      patch({
        isSaving: false,
        error: err instanceof Error ? err.message : "No se pudo crear el gasto fijo.",
      });
      throw err;
    }
  },

  async updateTemplate(input: {
    id: string;
    name: string;
    baseValue: number;
    dueDay?: number | null;
  }) {
    patch({ isSaving: true, error: null });
    try {
      const snapshot = await updateFixedExpenseAction({
        ...input,
        monthKey: state$.value.monthKey,
      });
      patch({ snapshot, isSaving: false, error: null });
    } catch (err) {
      patch({
        isSaving: false,
        error: err instanceof Error ? err.message : "No se pudo actualizar el gasto fijo.",
      });
      throw err;
    }
  },

  async deactivateTemplate(id: string) {
    patch({ isSaving: true, error: null });
    try {
      const snapshot = await deactivateFixedExpenseAction({
        id,
        monthKey: state$.value.monthKey,
      });
      patch({ snapshot, isSaving: false, error: null });
    } catch (err) {
      patch({
        isSaving: false,
        error: err instanceof Error ? err.message : "No se pudo archivar el gasto fijo.",
      });
      throw err;
    }
  },

  async deposit(amount: number) {
    patch({ isSaving: true, error: null });
    try {
      const snapshot = await depositToFixedExpensesFundAction({
        amount,
        monthKey: state$.value.monthKey,
      });
      patch({ snapshot, isSaving: false, error: null });
    } catch (err) {
      patch({
        isSaving: false,
        error: err instanceof Error ? err.message : "No se pudo registrar el aporte.",
      });
      throw err;
    }
  },

  async markPaid(paymentId: string, realValue: number, paidDate?: string) {
    patch({ isSaving: true, error: null });
    try {
      const snapshot = await markFixedExpensePaidAction({
        paymentId,
        realValue,
        monthKey: state$.value.monthKey,
        paidDate,
      });
      patch({ snapshot, isSaving: false, error: null });
    } catch (err) {
      patch({
        isSaving: false,
        error: err instanceof Error ? err.message : "No se pudo marcar como pagado.",
      });
      throw err;
    }
  },

  async updatePaid(paymentId: string, realValue: number, paidDate: string) {
    patch({ isSaving: true, error: null });
    try {
      const snapshot = await updateFixedExpensePaidAction({
        paymentId,
        realValue,
        paidDate,
        monthKey: state$.value.monthKey,
      });
      patch({ snapshot, isSaving: false, error: null });
    } catch (err) {
      patch({
        isSaving: false,
        error: err instanceof Error ? err.message : "No se pudo actualizar el pago.",
      });
      throw err;
    }
  },

  async unmarkPaid(paymentId: string) {
    patch({ isSaving: true, error: null });
    try {
      const snapshot = await unmarkFixedExpensePaidAction({
        paymentId,
        monthKey: state$.value.monthKey,
      });
      patch({ snapshot, isSaving: false, error: null });
    } catch (err) {
      patch({
        isSaving: false,
        error: err instanceof Error ? err.message : "No se pudo deshacer el pago.",
      });
      throw err;
    }
  },
};
