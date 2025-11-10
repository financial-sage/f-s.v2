'use client';

import React, { useState } from 'react';
import TransactionFormModal from './TransactionFormModal';
import { supabase } from '@/src/lib/supabase/client';
import { deleteTransactionWithBalanceAdjustment } from '@/src/lib/supabase/transactions';
import { showError, showDeleteConfirm } from '@/src/utils/sweetAlert';

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
  const [showDeleteConfirmState, setShowDeleteConfirmState] = useState(false);
  const [loading, setLoading] = useState(false);

  // Solo para transferencias (que no se pueden editar, solo eliminar)
  const handleDelete = async () => {
    if (!showDeleteConfirmState) {
      const confirmed = await showDeleteConfirm('esta transacción');
      if (!confirmed) return;
      setShowDeleteConfirmState(true);
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showError('No hay sesión activa', 'Error de autenticación');
        return;
      }

      const result = await deleteTransactionWithBalanceAdjustment(
        transaction.id,
        session.user.id
      );

      if (result.error) {
        showError(result.error.message, 'Error al eliminar');
        return;
      }

      // Disparar evento para actualizar otros componentes (AccountsSlide, etc.)
      console.log('🚀 Disparando evento dashboard:update desde EditTransactionModal');
      window.dispatchEvent(new Event('dashboard:update'));

      onSaved();
      onClose();
    } catch (err) {
      console.error('Error al eliminar:', err);
      showError('Error al eliminar la transacción');
    } finally {
      setLoading(false);
    }
  };

  if (transaction.type === 'transfer') {
    return (
      <div className="fixed inset-0 bg-black/70 z-60 lg:z-40" suppressHydrationWarning>
        <div 
          className="modal z-60 lg:z-50 border border-zinc-700 max-w-md max-h-[calc(100vh-4rem)] lg:max-h-[90vh]" 
          style={{ background: "var(--background-gradient)" }} 
          suppressHydrationWarning
        >
          <div className="modal__header border-b border-zinc-700">
            <h2 className="text-zinc-400">Transferencia</h2>
            <button className="modal__close" onClick={onClose}></button>
          </div>
          <div className="modal__content p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                <i className="fas fa-exchange-alt text-blue-400 text-2xl"></i>
              </div>
              <h3 className="text-lg font-medium text-zinc-200 mb-2">
                No se puede editar
              </h3>
              <p className="text-zinc-400 text-sm">
                Las transferencias no se pueden modificar. Solo puedes eliminarla y crear una nueva si es necesario.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (showDeleteConfirmState) setShowDeleteConfirmState(false);
                  else onClose();
                }}
                className="py-3.5 sm:py-3 rounded-lg font-medium transition-all text-base sm:text-sm border border-zinc-600 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200"
                disabled={loading}
              >
                {showDeleteConfirmState ? 'Cancelar' : 'Cerrar'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className={`py-3.5 sm:py-3 rounded-lg font-medium transition-all text-base sm:text-sm border ${
                  showDeleteConfirmState
                    ? 'border-red-500 bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500'
                } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                disabled={loading}
              >
                {loading ? 'Eliminando...' : showDeleteConfirmState ? '¿Confirmar?' : 'Eliminar'}
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
