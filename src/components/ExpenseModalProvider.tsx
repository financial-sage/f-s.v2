"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export interface ExpenseToEdit {
  id: string;
  amount: number;
  concept: string;
  category?: string | null;
  category_id?: string | null;
  spend_segment?: string | null;
  paid_by?: string | null;
  responsible_for?: string | null;
  fund_id?: string | null;
}

/** Prefill for a new simple-mode expense (does not switch to edit form). */
export interface ExpenseDraft {
  amount?: number;
  concept?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  paidAccountId?: string | null;
  /** 1 amount · 2 category · 3 confirm */
  initialStep?: 1 | 2 | 3;
}

interface ExpenseModalContextValue {
  isExpenseModalOpen: boolean;
  setIsExpenseModalOpen: Dispatch<SetStateAction<boolean>>;
  expenseToEdit: ExpenseToEdit | null;
  setExpenseToEdit: Dispatch<SetStateAction<ExpenseToEdit | null>>;
  expenseDraft: ExpenseDraft | null;
  setExpenseDraft: Dispatch<SetStateAction<ExpenseDraft | null>>;
  preferredFundId: string | null;
  setPreferredFundId: Dispatch<SetStateAction<string | null>>;
}

const ExpenseModalContext = createContext<ExpenseModalContextValue | null>(null);

export function ExpenseModalProvider({ children }: { children: ReactNode }) {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseToEdit | null>(null);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseDraft | null>(null);
  const [preferredFundId, setPreferredFundId] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      isExpenseModalOpen,
      setIsExpenseModalOpen,
      expenseToEdit,
      setExpenseToEdit,
      expenseDraft,
      setExpenseDraft,
      preferredFundId,
      setPreferredFundId,
    }),
    [expenseDraft, expenseToEdit, isExpenseModalOpen, preferredFundId]
  );

  return (
    <ExpenseModalContext.Provider value={value}>
      {children}
    </ExpenseModalContext.Provider>
  );
}

export function useExpenseModal() {
  const context = useContext(ExpenseModalContext);

  if (!context) {
    throw new Error("useExpenseModal must be used within ExpenseModalProvider.");
  }

  return context;
}
