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
  paid_by?: string | null;
  responsible_for?: string | null;
}

interface ExpenseModalContextValue {
  isExpenseModalOpen: boolean;
  setIsExpenseModalOpen: Dispatch<SetStateAction<boolean>>;
  expenseToEdit: ExpenseToEdit | null;
  setExpenseToEdit: Dispatch<SetStateAction<ExpenseToEdit | null>>;
}

const ExpenseModalContext = createContext<ExpenseModalContextValue | null>(null);

export function ExpenseModalProvider({ children }: { children: ReactNode }) {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<ExpenseToEdit | null>(null);

  const value = useMemo(
    () => ({
      isExpenseModalOpen,
      setIsExpenseModalOpen,
      expenseToEdit,
      setExpenseToEdit,
    }),
    [expenseToEdit, isExpenseModalOpen]
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
