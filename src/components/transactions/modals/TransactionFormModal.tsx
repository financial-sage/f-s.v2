'use client';

import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/src/lib/supabase/client';
import { CurrencyContext, CurrencyContextType } from '@/src/contexts/CurrencyContext';
import { useTransactionContext } from '@/src/contexts/TransactionContext';
import { CategoryIcon } from '@/src/components/categories/CategoryIcons';
import AccountSelectorModal from '@/src/components/accounts/modal/AccountSelectorModal';
import { QuickCategoryForm } from '@/src/components/categories/QuickCategoryForm';
import { Category, getUserCategories } from '@/src/lib/supabase/categories';
import { getUserAccounts } from '@/src/lib/supabase/accounts';
import { addTransaction, NewTransaction, getCategoryExpenses, updateTransactionWithBalanceAdjustment, deleteTransactionWithBalanceAdjustment } from '@/src/lib/supabase/transactions';
import type { Account } from '@/src/types/types';
import { CurrencyInput } from '@/src/components/common';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  type: 'expense' | 'income';
  accountId?: string;
  preselectedAccountId?: string;
  transactionId?: string;
  initialData?: {
    amount: number;
    description: string;
    date: string;
    categoryId?: string;
    subcategoryId?: string;
    accountId?: string;
    destinationAccountId?: string;
  };
  onSaved?: () => void;
  onTransactionComplete?: () => void;
  onAccountChange?: (newAccountId: string) => void;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
}

export default function TransactionFormModal({
  isOpen,
  onClose,
  mode,
  type,
  accountId,
  preselectedAccountId,
  transactionId,
  initialData,
  onSaved,
  onTransactionComplete,
  onAccountChange
}: TransactionFormModalProps) {
  const currencyContext = useContext(CurrencyContext);
  const { refetch: refetchTransactions } = useTransactionContext();
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialData?.categoryId || null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(initialData?.subcategoryId || null);
  const [selectedDestinationAccountId, setSelectedDestinationAccountId] = useState<string | null>(
    initialData?.destinationAccountId || preselectedAccountId || null
  );
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categoryExpenses, setCategoryExpenses] = useState<Record<string, number>>({});
  const [amount, setAmount] = useState<string>(initialData?.amount?.toString() || '');
  const [note, setNote] = useState<string>(initialData?.description || '');
  const [date, setDate] = useState(initialData?.date?.split('T')[0] || new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentAccountId, setCurrentAccountId] = useState<string | undefined>(
    initialData?.accountId || accountId
  );
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  if (!currencyContext) {
    throw new Error('Currency context must be used within CurrencyProvider');
  }

  const { currency } = currencyContext;

  // Pre-seleccionar cuenta cuando cambie preselectedAccountId
  useEffect(() => {
    if (preselectedAccountId && type === 'income' && mode === 'add') {
      setSelectedDestinationAccountId(preselectedAccountId);
    }
  }, [preselectedAccountId, type, mode]);

  // Función para recargar categorías
  const reloadCategories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const categoriesResult = await getUserCategories(session.user.id);
      if (categoriesResult.data && Array.isArray(categoriesResult.data)) {
        setCategories(categoriesResult.data);
      }

      // También recargar gastos por categoría
      const expensesResult = await getCategoryExpenses(session.user.id);
      if (!expensesResult.error && expensesResult.data) {
        setCategoryExpenses(expensesResult.data);
      }
    } catch (err) {
      console.error('Error recargando categorías:', err);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Cargar categorías
        const categoriesResult = await getUserCategories(session.user.id);
        if (categoriesResult.data && Array.isArray(categoriesResult.data)) {
          setCategories(categoriesResult.data);
        }

        // Cargar cuentas
        const accountsResult = await getUserAccounts(session.user.id);
        if (accountsResult.data && Array.isArray(accountsResult.data)) {
          setAccounts(accountsResult.data);
          // Cargar cuenta inicial (usar currentAccountId o accountId)
          const accountToLoad = currentAccountId || accountId;
          if (accountToLoad) {
            const selectedAccount = accountsResult.data.find((acc: Account) => acc.id === accountToLoad);
            if (selectedAccount) setAccount(selectedAccount);
          }
        }

        // Cargar gastos por categoría
        const expensesResult = await getCategoryExpenses(session.user.id);
        if (!expensesResult.error && expensesResult.data) {
          setCategoryExpenses(expensesResult.data);
        }
      } catch (err) {
        console.error('Error cargando datos:', err);
      }
    };

    loadData();
  }, [isOpen, accountId, currentAccountId, currency]);

  // Cargar subcategorías cuando cambie la categoría
  useEffect(() => {
    if (!selectedCategoryId) {
      setSubcategories([]);
      setSelectedSubcategoryId(null);
      return;
    }

    const loadSubcategories = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data, error } = await supabase
          .from('subcategories')
          .select('*')
          .eq('category_id', selectedCategoryId)
          .eq('user_id', session.user.id)
          .order('name', { ascending: true });

        if (error) throw error;
        setSubcategories(data || []);
      } catch (err) {
        console.error('Error cargando subcategorías:', err);
        setSubcategories([]);
      }
    };

    loadSubcategories();
  }, [selectedCategoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación según el tipo
    if (type === 'expense') {
      if (!selectedCategoryId) {
        setError('Por favor selecciona una categoría');
        return;
      }
    } else {
      if (!selectedDestinationAccountId) {
        setError('Por favor selecciona una cuenta destino');
        return;
      }
    }

    if (!amount || isNaN(parseFloat(amount))) {
      setError('Por favor ingresa un monto válido');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No hay sesión activa');
        return;
      }

      const selectedDate = new Date(date);
      const now = new Date();
      selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

      if (mode === 'add') {
        // Modo agregar
        const newTransaction: NewTransaction = {
          amount: parseFloat(amount),
          category_id: type === 'expense' ? (selectedCategoryId || undefined) : undefined,
          subcategory_id: type === 'expense' ? (selectedSubcategoryId || undefined) : undefined,
          account_id: type === 'income' ? selectedDestinationAccountId! : currentAccountId!,
          description: note || undefined,
          type: type,
          date: selectedDate.toISOString(),
          status: 'completed' // Estado siempre completado
        };

        const result = await addTransaction(session.user.id, newTransaction);
        
        if (result.error) {
          setError(result.error.message);
          return;
        }

        // Disparar evento de actualización
        const updateEvent = new CustomEvent('dashboard:update', {
          detail: {
            accountId: type === 'income' ? selectedDestinationAccountId : currentAccountId,
            type: type
          }
        });
        window.dispatchEvent(updateEvent);

        // Refrescar transacciones inmediatamente
        await refetchTransactions();
      } else {
        // Modo editar
        if (!transactionId) {
          setError('ID de transacción no proporcionado');
          return;
        }

        const updates: Record<string, string | number | null> = {
          amount: parseFloat(amount),
          description: note || null,
          date: selectedDate.toISOString(),
          status: 'completed' // Estado siempre completado
        };

        // Siempre incluir campos de categoría y cuenta para expenses e incomes
        updates.category_id = selectedCategoryId || null;
        updates.subcategory_id = selectedSubcategoryId || null;
        updates.account_id = type === 'income' ? selectedDestinationAccountId : currentAccountId || null;

        const result = await updateTransactionWithBalanceAdjustment(
          transactionId,
          session.user.id,
          updates
        );

        if (result.error) {
          setError(result.error.message);
          return;
        }

        // Disparar evento de actualización después de editar
        console.log('🚀 Disparando evento dashboard:update desde TransactionFormModal (edit)');
        window.dispatchEvent(new Event('dashboard:update'));
      }

      // Callbacks de éxito
      if (onSaved) {
        await onSaved();
      }
      
      if (onTransactionComplete) {
        onTransactionComplete();
      }

      // Limpiar el formulario y cerrar
      setAmount('');
      setNote('');
      setSelectedCategoryId(null);
      setSelectedSubcategoryId(null);
      setSelectedDestinationAccountId(null);
      onClose();

    } catch (err) {
      setError(`Error al ${mode === 'add' ? 'guardar' : 'actualizar'} la transacción`);
      console.error('Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    if (!transactionId) {
      setError('ID de transacción no proporcionado');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No hay sesión activa');
        return;
      }

      const result = await deleteTransactionWithBalanceAdjustment(
        transactionId,
        session.user.id
      );

      if (result.error) {
        setError(result.error.message);
        return;
      }

      // Refrescar transacciones inmediatamente
      await refetchTransactions();

      // Disparar evento de actualización
      window.dispatchEvent(new Event('dashboard:update'));

      // Callbacks de éxito
      if (onSaved) {
        await onSaved();
      }

      onClose();

    } catch (err) {
      setError('Error al eliminar la transacción');
      console.error('Error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hexToRgba = (hex: string, alpha = 1) => {
    try {
      const h = hex.replace('#', '');
      const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch (e) {
      return `rgba(99,102,241,${alpha})`;
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/70 z-60 lg:z-40" suppressHydrationWarning>
      <div 
        className="modal z-60 lg:z-50 border border-zinc-700 flex flex-col max-h-[calc(100vh-4rem)] lg:max-h-[90vh]" 
        style={{ background: "var(--background-gradient)" }} 
        suppressHydrationWarning
      >
        <div className="modal__header border-b border-zinc-700 flex-shrink-0">
          <h2 className="text-zinc-400">
            {mode === 'add' ? 'Agregar' : 'Editar'} {type === 'expense' ? 'gasto' : 'ingreso'}
          </h2>
          <button className="modal__close" onClick={onClose}></button>
        </div>
        <div className="modal__content flex-1 overflow-y-auto pb-6">
          {/* Sección "Desde" para gastos (agregar y editar) */}
          {type === 'expense' && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-zinc-400 mb-2">Desde:</label>
              <div className="flex items-center gap-2 dark:bg-black/5 p-2 rounded-md" suppressHydrationWarning>
                {/* Información de la cuenta */}
                <div className="flex-1 flex items-center gap-2 text-zinc-400 dark:bg-white/5 rounded-md p-2 min-w-0" suppressHydrationWarning>
                  {account ? (
                    <>
                      <i className={`fas ${account.icon || 'fa-wallet'} text-xl`} style={{ color: account.color }} />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm truncate">{account.name}</span>
                        <span className="text-xs text-zinc-500">
                          {currencyContext.formatAmount(account.balance)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <span className="text-sm">Cargando...</span>
                  )}
                </div>
                
                {/* Botón de cambiar cuenta */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <AccountSelectorModal 
                    type={type}
                    currentAccountId={currentAccountId || ''}
                    onAccountSelect={async (newAccountId) => {
                      console.log('Cambiando a cuenta:', newAccountId);
                      try {
                        const selectedAccount = accounts.find((acc: Account) => acc.id === newAccountId);
                        if (selectedAccount) {
                          setAccount(selectedAccount);
                          setCurrentAccountId(newAccountId);
                          if (onAccountChange) {
                            onAccountChange(newAccountId);
                          }
                        }
                      } catch (err) {
                        console.error('Error al cambiar cuenta:', err);
                      }
                    }}
                  />
                  <label className="text-xs sm:text-sm whitespace-nowrap hidden sm:inline">Cambiar cuenta</label>
                  <label className="text-xs whitespace-nowrap sm:hidden">Cambiar</label>
                </div>
              </div>
            </div>
          )}

          {/* Categorías o Cuentas según el tipo */}
          {type === 'expense' ? (
            <>
              {categories.filter(c => c.type === type).length === 0 && (
                <div className="m-2 p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
                  <p className="text-zinc-400 text-sm mb-3">No hay categorías disponibles.</p>
                  <button
                    type="button"
                    onClick={() => setShowCategoryForm(true)}
                    className="w-full py-2.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg text-blue-400 font-medium transition-all text-sm"
                  >
                    + Crear primera categoría
                  </button>
                </div>
              )}
              {categories.filter(c => c.type === type).length > 0 && (
                <div className="m-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-zinc-400">Categorías:</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryForm(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                      <i className="fas fa-plus text-[10px]"></i>
                      Nueva
                    </button>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-7 gap-1.5 sm:gap-2 dark:text-zinc-400">
                  {categories.filter(c => c.type === type).map((option) => {
                    const isSelected = selectedCategoryId === option.id;
                    const spent = categoryExpenses[option.id] || 0;
                    const limit = option.budget_limit || 0;
                    const percent = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;

                    return (
                      <div
                        key={option.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedCategoryId(isSelected ? null : option.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedCategoryId(isSelected ? null : option.id);
                          }
                        }}
                        className={`relative overflow-hidden flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg cursor-pointer border transition-all ${
                          isSelected
                            ? 'bg-zinc-800/50 border-zinc-600'
                            : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'
                        }`}
                      >
                        {limit > 0 && (
                          <div
                            className="absolute inset-0 opacity-20"
                            style={{
                              background: `linear-gradient(to top, ${hexToRgba(option.color || '#6366f1', 0.5)} ${percent}%, transparent ${percent}%)`
                            }}
                          />
                        )}
                        <div className="relative z-10">
                          <CategoryIcon
                            iconName={option.icon || "wallet"}
                            color={option.color || "#6366f1"}
                            size={window.innerWidth < 640 ? 20 : 28}
                          />
                        </div>
                        <span className="relative z-10 text-[10px] sm:text-xs text-center mt-1 sm:mt-1.5 line-clamp-2 leading-tight">
                          {option.name}
                        </span>
                        {limit > 0 && (
                          <span className="relative z-10 text-[8px] sm:text-[10px] text-zinc-500 mt-0.5">
                            {percent}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                </div>
              )}
            </>
          ) : (
            <div className="mb-4">
              <label className="block text-xs sm:text-sm font-medium text-zinc-400 mb-2">
                ¿A qué cuenta va este ingreso? *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {accounts.map((acc) => {
                  const isSelected = selectedDestinationAccountId === acc.id;
                  return (
                    <div
                      key={acc.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedDestinationAccountId(isSelected ? null : acc.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedDestinationAccountId(isSelected ? null : acc.id);
                        }
                      }}
                      className={`relative overflow-hidden flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer border transition-all ${
                        isSelected
                          ? 'bg-zinc-800/50 border-zinc-600 ring-2 ring-blue-500/50'
                          : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'
                      }`}
                    >
                      <i 
                        className={`fas ${acc.icon || 'fa-wallet'} text-2xl mb-2`}
                        style={{ color: acc.color }}
                      />
                      <span className="text-xs text-center text-zinc-300 line-clamp-2">
                        {acc.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 mt-1">
                        {currencyContext.formatAmount(acc.balance)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Subcategorías */}
          {type === 'expense' && subcategories.length > 0 && selectedCategoryId && (
            <div className="ml-2 mr-2 sm:ml-6 sm:mr-6 mb-4">
              <label className="block text-xs sm:text-sm font-medium text-zinc-400 mb-2">
                Subcategoría {selectedSubcategoryId && '✓'}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2">
                {subcategories.map((sub) => {
                  const isSelected = selectedSubcategoryId === sub.id;
                  const parentCategory = categories.find(c => c.id === sub.category_id);

                  return (
                    <div
                      key={sub.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedSubcategoryId(isSelected ? null : sub.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedSubcategoryId(isSelected ? null : sub.id);
                        }
                      }}
                      className={`relative flex items-center justify-center p-2 sm:p-2.5 rounded-lg cursor-pointer border transition-all ${
                        isSelected
                          ? 'border-zinc-600 ring-2 ring-blue-500/50'
                          : 'border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'
                      }`}
                      style={{
                        background: isSelected
                          ? hexToRgba(parentCategory?.color || '#6366f1', 0.15)
                          : hexToRgba(parentCategory?.color || '#6366f1', 0.05)
                      }}
                    >
                      <span className="text-[10px] sm:text-xs text-zinc-300 text-center line-clamp-2 leading-tight">
                        {sub.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="ml-2 mr-2 sm:ml-6 sm:mr-6 mb-4 space-y-3">
            {error && (
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-400">Monto *</label>
                  <input
                    placeholder="0.00" 
                    type="number" 
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3 py-3 sm:py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-base sm:text-sm text-right"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-400">Fecha *</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3 py-3 sm:py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-base sm:text-sm"
                  />
                </div>
                
                <div className="space-y-1.5 hidden sm:block">
                  <label className="block text-xs font-medium text-zinc-400">Descripción</label>
                  <input
                    placeholder="Descripción (opcional)" 
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-sm"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5 sm:hidden">
                <label className="block text-xs font-medium text-zinc-400">Descripción</label>
                <input
                  placeholder="Descripción (opcional)" 
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-3 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-base"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Botones - Fixed footer */}
        <div className="border-t border-zinc-700 p-4 sm:p-6 bg-zinc-900/30 flex-shrink-0">
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'add' ? (
              /* Modo agregar - Cancelar y Guardar */
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={onClose}
                  className="py-3.5 sm:py-3 rounded-lg font-medium transition-all text-base sm:text-sm border border-zinc-600 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting || (type === 'expense' ? !selectedCategoryId : !selectedDestinationAccountId)}
                  className={`py-3.5 sm:py-3 rounded-lg text-zinc-100 font-medium transition-all text-base sm:text-sm ${
                    isSubmitting || (type === 'expense' ? !selectedCategoryId : !selectedDestinationAccountId)
                      ? 'bg-zinc-600/20 cursor-not-allowed opacity-60'
                      : type === 'expense'
                        ? 'bg-red-500/30 hover:bg-red-500/40 active:bg-red-500/50'
                        : 'bg-green-500/30 hover:bg-green-500/40 active:bg-green-500/50'
                  }`}
                >
                  {isSubmitting 
                    ? 'Guardando...'
                    : (type === 'expense' ? 'Guardar Gasto' : 'Guardar Ingreso')
                  }
                </button>
              </div>
            ) : (
              /* Modo edición - Actualizar (arriba) y Eliminar | Cerrar (abajo) */
              <>
                <button 
                  type="submit"
                  disabled={isSubmitting || (type === 'expense' ? !selectedCategoryId : !selectedDestinationAccountId)}
                  className={`w-full py-3.5 sm:py-3 rounded-lg text-zinc-100 font-medium transition-all text-base sm:text-sm ${
                    isSubmitting || (type === 'expense' ? !selectedCategoryId : !selectedDestinationAccountId)
                      ? 'bg-zinc-600/20 cursor-not-allowed opacity-60'
                      : type === 'expense'
                        ? 'bg-red-500/30 hover:bg-red-500/40 active:bg-red-500/50'
                        : 'bg-green-500/30 hover:bg-green-500/40 active:bg-green-500/50'
                  }`}
                >
                  {isSubmitting 
                    ? 'Actualizando...'
                    : (type === 'expense' ? 'Actualizar Gasto' : 'Actualizar Ingreso')
                  }
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className={`py-3.5 sm:py-3 rounded-lg font-medium transition-all text-base sm:text-sm border ${
                      showDeleteConfirm
                        ? 'border-red-500 bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'border-zinc-600 text-zinc-400 hover:bg-zinc-700/50 hover:text-red-400 hover:border-red-500/50'
                    } ${isSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {showDeleteConfirm ? '¿Confirmar eliminación?' : 'Eliminar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (showDeleteConfirm) {
                        setShowDeleteConfirm(false);
                      } else {
                        onClose();
                      }
                    }}
                    disabled={isSubmitting}
                    className={`py-3.5 sm:py-3 rounded-lg font-medium transition-all text-base sm:text-sm border border-zinc-600 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200 ${
                      isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    {showDeleteConfirm ? 'Cancelar' : 'Cerrar'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>

      {/* Modal para crear nueva categoría */}
      {showCategoryForm && (
        <QuickCategoryForm
          type={type}
          onClose={() => setShowCategoryForm(false)}
          onSuccess={async () => {
            await reloadCategories();
            setShowCategoryForm(false);
          }}
        />
      )}
    </div>,
    document.body
  );
}
