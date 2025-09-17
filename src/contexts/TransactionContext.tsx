"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useTransactions } from '@/src/hooks/useTransactions';
import { Transaction, TransactionWithCategory } from '@/src/lib/supabase/transactions';
import { useSession } from '@/src/hooks/useSession';

interface TransactionContextType {
  transactions: TransactionWithCategory[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addTransactionToList: (transaction: Transaction) => void;
  updateTransactionInList: (id: string, updatedTransaction: Partial<Transaction>) => void;
  removeTransactionFromList: (id: string) => void;
}

const TransactionContext = createContext<TransactionContextType | null>(null);

interface TransactionProviderProps {
  children: ReactNode;
}

export function TransactionProvider({ children }: TransactionProviderProps) {
  const { session } = useSession();
  const transactionHook = useTransactions(session?.user?.id || null);

  return (
    <TransactionContext.Provider value={transactionHook}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactionContext() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactionContext must be used within a TransactionProvider');
  }
  return context;
}
