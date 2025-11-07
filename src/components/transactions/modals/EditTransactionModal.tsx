'use client';

import React, { useState } from 'react';
import TransactionFormModal from './TransactionFormModal';
import { supabase } from '@/src/lib/supabase/client';
import { deleteTransactionWithBalanceAdjustment } from '@/src/lib/supabase/transactions';

interface Transaction {
  id: string;
  amount: number;
  description: string | null;
  category_id: string | null;
  subcategory_id?: string | null;
  account_id: string | null;
  destination_account_id?: string | null;
  date: string;
  type: 'income' | 'expense' | 'transfer';
  status: 'pending' | 'completed' | 'canceled';
}

interface EditTransactionModalProps {
  transaction: Transaction;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditTransactionModal({ transaction, onClose, onSaved }: EditTransactionModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Solo para transferencias (que no se pueden editar, solo eliminar)
  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('No hay sesi�n activa');
        return;
      }

      const result = await deleteTransactionWithBalanceAdjustment(
        transaction.id,
        session.user.id
      );

      if (result.error) {
        alert(result.error.message);
        return;
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('Error al eliminar la transacci�n');
    } finally {
      setLoading(false);
    }
  };

  if (transaction.type === 'transfer') {
    return (
      <div className="fixed inset-0 bg-black/70 z-40" suppressHydrationWarning>
        <div 
          className="modal z-50 border border-zinc-700 max-w-md" 
          style={{ background: "var(--background-gradient)" }} 
          suppressHydrationWarning
        >
          <div className="modal__header border-b border-zinc-700">
            <h2 className="text-zinc-400">Transferencia</h2>
            <button className="modal__close" onClick={onClose}></button>
          </div>
          <div className="modal__content">
            <p className="text-zinc-400 text-center py-8">
              Las transferencias no se pueden editar en este momento.
            </p>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleDelete}
                className={`flex-1 px-4 py-2 rounded-full border transition-colors ${
                  showDeleteConfirm
                    ? 'border-red-500 bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'border-zinc-600 text-zinc-400 hover:bg-zinc-700/50 hover:text-red-400'
                }`}
                disabled={loading}
              >
                {showDeleteConfirm ? '�Confirmar eliminaci�n?' : 'Eliminar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (showDeleteConfirm) setShowDeleteConfirm(false);
                  else onClose();
                }}
                className="flex-1 px-4 py-2 rounded-full border border-zinc-600 text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                disabled={loading}
              >
                {showDeleteConfirm ? 'Cancelar' : 'Cerrar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TransactionFormModal
      isOpen={true}
      onClose={onClose}
      mode="edit"
      type={transaction.type as 'expense' | 'income'}
      accountId={transaction.account_id || undefined}
      transactionId={transaction.id}
      initialData={{
        amount: Math.abs(transaction.amount),
        description: transaction.description || '',
        date: transaction.date,
        categoryId: transaction.category_id || undefined,
        subcategoryId: transaction.subcategory_id || undefined,
        accountId: transaction.account_id || undefined,
        destinationAccountId: transaction.destination_account_id || undefined,
      }}
      onSaved={onSaved}
    />
  );
}
