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
        alert('No hay sesión activa');
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

      // Disparar evento para actualizar otros componentes (AccountsSlide, etc.)
      console.log('🚀 Disparando evento dashboard:update desde EditTransactionModal');
      window.dispatchEvent(new Event('dashboard:update'));

      onSaved();
      onClose();
    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('Error al eliminar la transacción');
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
            
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleDelete}
                className={`w-full px-4 py-3 rounded-lg border transition-all ${
                  showDeleteConfirm
                    ? 'border-red-500 bg-red-500/20 text-red-400 hover:bg-red-500/30 font-medium'
                    : 'border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500'
                }`}
                disabled={loading}
              >
                {loading ? 'Eliminando...' : showDeleteConfirm ? '¿Confirmar eliminación?' : 'Eliminar transferencia'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (showDeleteConfirm) setShowDeleteConfirm(false);
                  else onClose();
                }}
                className="w-full px-4 py-3 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800/50 transition-all"
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
