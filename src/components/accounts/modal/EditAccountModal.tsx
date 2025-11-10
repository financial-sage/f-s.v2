"use client";

import { useState, useEffect, useContext } from "react";
import { supabase } from '@/src/lib/supabase/client';
import { updateAccount, getUserAccounts } from '@/src/lib/supabase/accounts';
import { Account } from "@/src/types/types";
import { CurrencyContext } from '@/src/contexts/CurrencyContext';
import AccountSelectorModal from './AccountSelectorModal';
import { CurrencyInput } from '@/src/components/common';

interface EditAccountModalProps {
  account: Account;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditAccountModal({ account, onClose, onSaved }: EditAccountModalProps) {
  const currencyContext = useContext(CurrencyContext);
  const [balance, setBalance] = useState<number>(account.balance);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAccount, setCurrentAccount] = useState<Account>(account);
  const [accounts, setAccounts] = useState<Account[]>([]);

  if (!currencyContext) {
    throw new Error('Currency context must be used within CurrencyProvider');
  }

  // Cargar cuentas para el selector
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const result = await getUserAccounts(session.user.id);
        if (result.data && Array.isArray(result.data)) {
          setAccounts(result.data as Account[]);
        }
      } catch (err) {
        console.error('Error cargando cuentas:', err);
      }
    };
    loadAccounts();
  }, []);

  // Actualizar balance cuando cambia la cuenta seleccionada
  useEffect(() => {
    setBalance(currentAccount.balance);
  }, [currentAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setError('No hay sesión activa');
        return;
      }

      // Solo actualizar el balance
      const result = await updateAccount(currentAccount.id, session.user.id, {
        balance: balance
      });
      
      if (result.error) {
        setError(result.error.message);
        return;
      }

      onSaved();
      onClose();
    } catch (err) {
      setError('Error al actualizar el balance');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-60 lg:z-50 flex items-center justify-center p-0 lg:p-4">
      <div 
        className="rounded-none lg:rounded-xl w-full max-w-full lg:max-w-2xl border-0 lg:border border-zinc-700 shadow-2xl flex flex-col max-h-[calc(100vh-4rem)] lg:max-h-[90vh]"
        style={{ background: "var(--background-gradient)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-800 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-medium text-white">Ajustar Balance</h2>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Mostrar cuenta actual */}
        <div className="p-4 sm:p-6 border-b border-zinc-800 flex-shrink-0">
          <label className="block text-xs font-medium text-zinc-400 mb-2">Cuenta seleccionada:</label>
          <div className="flex items-center gap-2 dark:bg-black/5 p-2 rounded-md">
            {/* Información de la cuenta */}
            <div className="flex-1 flex items-center gap-2 text-zinc-400 dark:bg-white/5 rounded-md p-2 min-w-0">
              <i className={`fas ${currentAccount.icon || 'fa-wallet'} text-xl`} style={{ color: currentAccount.color }} />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm truncate">{currentAccount.name}</span>
                <span className="text-xs text-zinc-500">
                  {currencyContext.formatAmount(currentAccount.balance)}
                </span>
              </div>
            </div>
            
            {/* Botón de cambiar cuenta */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <AccountSelectorModal 
                type="expense"
                currentAccountId={currentAccount.id}
                showAllAccounts={true}
                onAccountSelect={async (newAccountId) => {
                  const selectedAccount = accounts.find((acc: Account) => acc.id === newAccountId);
                  if (selectedAccount) {
                    setCurrentAccount(selectedAccount);
                  }
                }}
              />
              <label className="text-xs sm:text-sm whitespace-nowrap hidden sm:inline">Cambiar cuenta</label>
              <label className="text-xs whitespace-nowrap sm:hidden">Cambiar</label>
            </div>
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 pb-24 lg:pb-6">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

          {/* Solo mostrar el campo de balance */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Balance de {currentAccount.name} *
            </label>
            <input
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2.5 bg-zinc-900/50 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-right"
              placeholder="0.00"
              required
              autoFocus
            />
            <p className="text-xs text-zinc-500 mt-2">
              Balance actual: {currencyContext.formatAmount(currentAccount.balance)}
            </p>
          </div>
          </form>
        </div>

        {/* Botones - Fixed footer en mobile */}
        <div className="border-t border-zinc-800 p-4 sm:p-6 bg-zinc-900/50 flex-shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 sm:py-2.5 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors font-medium border border-zinc-700"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="flex-1 px-4 py-3 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i>
                  Actualizando...
                </span>
              ) : (
                'Actualizar Balance'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
