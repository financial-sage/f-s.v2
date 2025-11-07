import { useState, useEffect, useRef, useContext } from "react";
import { createPortal } from "react-dom";
import { Blendy, createBlendy } from "blendy";
import { Category, getUserCategories } from "@/src/lib/supabase/categories";
import { CurrencyContext, CurrencyContextType } from "@/src/contexts/CurrencyContext";
import { supabase } from '@/src/lib/supabase/client';
import { addTransaction, NewTransaction, getCategoryExpenses } from "@/src/lib/supabase/transactions";
import { getUserAccounts, createAccount } from '@/src/lib/supabase/accounts';
import { Account } from '@/src/types/types';
import { CategoryIcon } from "../../categories/CategoryIcons";
import { CiCreditCard1, CiReceipt } from "react-icons/ci";
import IconCircleButton from '@/src/components/common/IconCircleButton';
import { GiPayMoney, GiReceiveMoney } from "react-icons/gi";
import { MdOutlineChangeCircle } from "react-icons/md";
import AccountSelectorModal from "../../accounts/modal/AccountSelectorModal";
import { Input } from "../../common";

interface AccountTransactionModalProps {
  accountId: string;
  categories?: Category[];
  type?: 'expense' | 'income';
  preselectedAccountId?: string; // Nueva prop para pre-seleccionar cuenta en ingresos
  onAccountChange?: (newAccountId: string) => void;
  onTransactionSaved?: () => void;
  onDashboardUpdate?: () => void; // Nueva prop para actualizar todo el dashboard
  onTransactionComplete?: () => void; // Nueva prop para mantener la tarjeta activa
}

interface ModalProps {
  onClose: () => void;
  categories: Category[];
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  categoryExpenses: Record<string, number>;
  currencyContext: CurrencyContextType;
  modalType: 'expense' | 'income';
  accountId: string;
  preselectedAccountId?: string;
  onAccountChange?: (newAccountId: string) => void;
  onTransactionSaved?: () => void;
  onDashboardUpdate?: () => void;
  onTransactionComplete?: () => void;
}

export default function AccountTransactionModal({ 
  accountId, 
  categories: propCategories, 
  type = 'expense',
  preselectedAccountId,
  onAccountChange, 
  onTransactionSaved, 
  onDashboardUpdate,
  onTransactionComplete 
}: AccountTransactionModalProps) {
  const blendy = useRef<Blendy | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [categories, setCategories] = useState<Category[]>(propCategories || []);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryExpenses, setCategoryExpenses] = useState<Record<string, number>>({});
  const currencyContext = useContext(CurrencyContext);

  if (!currencyContext) {
    throw new Error('Currency context must be used within CurrencyProvider');
  }

  useEffect(() => {
    blendy.current = createBlendy({ animation: 'dynamic' })
  }, [])

  // Cargar categorías cuando se abre el modal si no vienen por prop
  useEffect(() => {
    if (!showModal) return;
    if (propCategories && propCategories.length > 0) return;
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await getUserCategories(session.user.id);
        if (res.data && Array.isArray(res.data)) setCategories(res.data);
      } catch (err) {
        console.error('Error cargando categorías en modal:', err);
      }
    };
    load();
  }, [showModal, propCategories]);

  // Cargar totales gastados por categoría cuando se abre el modal
  useEffect(() => {
    if (!showModal) return;
    const loadExpenses = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await getCategoryExpenses(session.user.id);
        if (!res.error && res.data) setCategoryExpenses(res.data);
      } catch (err) {
        console.error('Error cargando gastos por categoría:', err);
      }
    };
    loadExpenses();
  }, [showModal, currencyContext.currency]); // Agregamos la moneda como dependencia

  return (
    <div>
      {showModal
        && createPortal(<Modal
          categories={categories.filter(c => c.type === type)}
          onClose={() => {
            blendy.current?.untoggle(`modal-transaction-${type}`, () => {
              setShowModal(false);
            })
          }}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
          categoryExpenses={categoryExpenses}
          modalType={type}
          accountId={accountId}
          preselectedAccountId={preselectedAccountId}
          currencyContext={currencyContext}
          onAccountChange={onAccountChange}
          onTransactionSaved={onTransactionSaved}
          onDashboardUpdate={onDashboardUpdate}
          onTransactionComplete={onTransactionComplete}
        />, document.body)
      }
      <IconCircleButton
        data-blendy-from={`modal-transaction-${type}`}
        onClick={() => {
          setShowModal(true);
          blendy.current?.toggle(`modal-transaction-${type}`)
        }}
        ariaLabel={`Agregar ${type === 'expense' ? 'gasto' : 'ingreso'}`}
        icon={type === 'expense' ? <GiPayMoney size={20} color="#f59e0b" /> : <GiReceiveMoney size={20} color="#4cbc3c" />}
        label={type === 'expense' ? '+ Gasto' : '+ Ingreso'}
      />
    </div>

  )
}

// Using Account type from src/types/types.ts

interface ModalProps {
  onClose: () => void;
  categories: Category[];
  selectedCategoryId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  categoryExpenses: Record<string, number>;
  modalType: 'expense' | 'income';
  accountId: string;
  currencyContext: CurrencyContextType;
  onAccountChange?: (newAccountId: string) => void;
  onTransactionSaved?: () => void;
  onDashboardUpdate?: () => void;
  onTransactionComplete?: () => void;
}

// Interface for transaction type
interface TransactionState {
  type: 'expense' | 'income';
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
}

function Modal({ 
  onClose, 
  categories, 
  selectedCategoryId, 
  setSelectedCategoryId, 
  categoryExpenses, 
  modalType = 'expense', 
  accountId,
  preselectedAccountId,
  currencyContext, 
  onAccountChange, 
  onTransactionSaved, 
  onDashboardUpdate,
  onTransactionComplete 
}: ModalProps) {
  const [account, setAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedDestinationAccountId, setSelectedDestinationAccountId] = useState<string | null>(preselectedAccountId || null);
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-seleccionar cuenta cuando cambie preselectedAccountId
  useEffect(() => {
    if (preselectedAccountId && modalType === 'income') {
      setSelectedDestinationAccountId(preselectedAccountId);
    }
  }, [preselectedAccountId, modalType]);

  useEffect(() => {
    const loadAccount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const accountsResult = await getUserAccounts(session.user.id);
        if (accountsResult.data && Array.isArray(accountsResult.data)) {
          setAccounts(accountsResult.data);
          const selectedAccount = accountsResult.data.find((acc: Account) => acc.id === accountId);
          if (selectedAccount) setAccount(selectedAccount);
        }
      } catch (err) {
        console.error('Error cargando cuenta:', err);
      }
    };
    loadAccount();
  }, [accountId, currencyContext.currency]);

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

  // Helper: convierte hex a rgba con alpha
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación diferente según el tipo
    if (modalType === 'expense') {
      if (!selectedCategoryId) {
        setError('Por favor selecciona una categoría');
        return;
      }
    } else {
      // Para ingresos, validar que se haya seleccionado una cuenta destino
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

      // Combinar la fecha seleccionada con la hora actual
      const selectedDate = new Date(date);
      const now = new Date();
      selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

      const newTransaction: NewTransaction = {
        amount: parseFloat(amount),
        category_id: modalType === 'expense' ? (selectedCategoryId || undefined) : undefined,
        subcategory_id: modalType === 'expense' ? (selectedSubcategoryId || undefined) : undefined,
        account_id: modalType === 'income' ? selectedDestinationAccountId! : accountId,
        description: note || undefined,
        type: modalType,
        date: selectedDate.toISOString()
      };

      const result = await addTransaction(session.user.id, newTransaction);
      
      if (result.error) {
        setError(result.error.message);
        return;
      }

      // Disparar evento de actualización del dashboard primero
      const updateEvent = new CustomEvent('dashboard:update', {
        detail: {
          accountId: modalType === 'income' ? selectedDestinationAccountId : accountId,
          type: modalType
        }
      });
      window.dispatchEvent(updateEvent);

      // Luego actualizar los datos
      if (onTransactionSaved) {
        await onTransactionSaved();
      }
      
      // Finalmente, mantener la tarjeta activa después de todas las actualizaciones
      if (onTransactionComplete) {
        onTransactionComplete();
      }
      window.dispatchEvent(updateEvent);

      // Limpiar el formulario y cerrar el modal
      setAmount('');
      setNote('');
      setSelectedCategoryId(null);
      setSelectedDestinationAccountId(null);
      onClose();

    } catch (err) {
      setError('Error al guardar la transacción');
      console.error('Error guardando transacción:', err);
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
      return `rgba(99,102,241,${alpha})`; // fallback purple
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-40" suppressHydrationWarning>
      <div className="modal z-50 border border-zinc-700" style={{ background: "var(--background-gradient)" }} data-blendy-to={`modal-transaction-${modalType}`} suppressHydrationWarning>
        <div className="modal__header border-b border-zinc-700">
          <h2 className="text-zinc-400">Agregar {modalType === 'expense' ? 'gasto' : 'ingreso'}</h2>
          <button className="modal__close" onClick={onClose}></button>
        </div>
        <div className="modal__content">
          {modalType === 'expense' && (
            <div className="mb-4">
              <label className="block text-xs font-medium text-zinc-400 mb-2">Desde:</label>
              <div className="flex items-center gap-2 dark:bg-black/5 p-2 rounded-md" suppressHydrationWarning>
                {/* Información de la cuenta */}
                <div className="flex-1 flex items-center gap-2 text-zinc-400 dark:bg-white/5 rounded-md p-2 min-w-0" suppressHydrationWarning>
                  {account ? (
                    <>
                      <i style={{color : `${account.color}`}} className={`fas ${account.icon} text-zinc-400 dark:bg-black/20 p-2 rounded-md flex-shrink-0`}></i>
                      <span className="text-sm opacity-75 truncate">
                        <b>{account.name}</b> ({currencyContext.formatAmount(account.balance)})
                      </span>
                    </>
                  ) : (
                    <span className="text-sm opacity-75">Cargando cuenta...</span>
                  )}
                </div>
                
                {/* Botón de cambiar cuenta */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <AccountSelectorModal 
                    type={modalType}
                    currentAccountId={accountId}
                    onAccountSelect={async (newAccountId) => {
                      console.log('Cambiando a cuenta:', newAccountId);
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) return;
                        
                        const accountsResult = await getUserAccounts(session.user.id);
                        if (accountsResult.data && Array.isArray(accountsResult.data)) {
                          const selectedAccount = accountsResult.data.find((acc: Account) => acc.id === newAccountId);
                          if (selectedAccount) {
                            setAccount(selectedAccount); // Actualizamos el estado con la nueva cuenta
                          }
                        }

                        if (onAccountChange) {
                          onAccountChange(newAccountId);
                        }
                      } catch (err) {
                        console.error('Error al cambiar de cuenta:', err);
                      }
                    }}
                  />
                  <label className="text-xs sm:text-sm whitespace-nowrap hidden sm:inline">Cambiar cuenta</label>
                  <label className="text-xs whitespace-nowrap sm:hidden">Cambiar</label>
                </div>
              </div>
            </div>
          )}
          {modalType === 'expense' ? (
            <>
              {categories.length === 0 && <p className="text-zinc-400">No hay categorías disponibles. Por favor, crea una categoría primero.</p>}
              {categories.length > 0 && (
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-7 gap-1.5 sm:gap-2 dark:text-zinc-400 m-2">
                  {categories.filter(c => c.type === modalType).map((option) => {
                    const isSelected = selectedCategoryId === option.id;

                    // spent vs limit
                    const spent = categoryExpenses[option.id] || 0;
                    const limit = option.budget_limit || 0;
                    const percent = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;

                    return (
                      <div
                        key={option.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => { setSelectedCategoryId(option.id); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedCategoryId(option.id); } }}
                        className={`relative overflow-hidden flex flex-col items-center p-2 sm:p-3 rounded-lg cursor-pointer border transition-all ${
                          isSelected 
                            ? 'bg-zinc-800/50 border-zinc-600' 
                            : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'
                        }`}
                        aria-pressed={isSelected}
                        aria-checked={isSelected}
                        suppressHydrationWarning
                      >
                        {/* Borde superior sutil con el color cuando está seleccionado */}
                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '2px',
                              background: option.color,
                              pointerEvents: 'none',
                            }}
                          ></div>
                        )}

                        {/* Indicador de presupuesto gastado (barra inferior) */}
                        {limit > 0 && (
                          <div 
                            style={{ 
                              position: 'absolute', 
                              left: 0, 
                              right: 0, 
                              bottom: 0, 
                              height: '3px', 
                              background: `linear-gradient(to right, ${option.color} ${percent}%, transparent ${percent}%)`,
                              pointerEvents: 'none', 
                              transition: 'all 300ms ease',
                              opacity: 0.6
                            }} 
                          />
                        )}

                        <div className="text-xl sm:text-2xl relative z-10 transition-all">
                          <CategoryIcon 
                            iconName={option.icon ?? 'default'} 
                            color={isSelected ? option.color : '#71717a'} 
                          />
                        </div>
                        <div className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 relative z-10 transition-colors text-center leading-tight ${
                          isSelected ? 'text-zinc-200' : 'text-zinc-500'
                        }`}>
                          {option.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            // Para ingresos, mostrar selector de cuentas
            <div className="mb-4">
              <label className="block text-xs sm:text-sm font-medium text-zinc-400 mb-2">
                ¿A qué cuenta va este ingreso? *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {accounts.map((acc) => {
                  const isSelected = selectedDestinationAccountId === acc.id;
                  
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setSelectedDestinationAccountId(acc.id)}
                      className={`relative group flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                        isSelected 
                          ? 'bg-zinc-800/50 border-zinc-600' 
                          : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'
                      }`}
                    >
                      {/* Borde superior con color de cuenta */}
                      {isSelected && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '2px',
                            background: acc.color,
                            pointerEvents: 'none',
                          }}
                        ></div>
                      )}
                      
                      <div 
                        className="flex items-center justify-center w-10 h-10 rounded-lg transition-all"
                        style={{ 
                          background: isSelected ? `${acc.color}20` : `${acc.color}10`,
                        }}
                      >
                        <i
                          className={`fa ${acc.icon} text-lg transition-all`}
                          style={{ color: acc.color }}
                        />
                      </div>
                      
                      <div className="text-center min-w-0 w-full">
                        <div className={`text-xs font-medium truncate transition-colors ${
                          isSelected ? 'text-zinc-200' : 'text-zinc-400'
                        }`}>
                          {acc.name}
                        </div>
                        <div className={`text-[10px] font-semibold transition-colors ${
                          isSelected ? 'text-zinc-300' : 'text-zinc-500'
                        }`}>
                          {currencyContext.formatAmount(acc.balance)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Subcategorías */}
          {modalType === 'expense' && subcategories.length > 0 && selectedCategoryId && (
            <div className="ml-2 mr-2 sm:ml-6 sm:mr-6 mb-4">
              <label className="block text-xs sm:text-sm font-medium text-zinc-400 mb-2">
                Subcategoría {selectedSubcategoryId && '✓'}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2">
                {subcategories.map((sub) => {
                  const isSelected = selectedSubcategoryId === sub.id;
                  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
                  const color = selectedCategory?.color || '#6366f1';
                  
                  return (
                    <div
                      key={sub.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedSubcategoryId(sub.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          setSelectedSubcategoryId(sub.id);
                        }
                      }}
                      className={`relative overflow-hidden flex items-center justify-center p-2 sm:p-2.5 rounded-lg cursor-pointer border transition-all ${
                        isSelected 
                          ? 'bg-zinc-800/40 border-zinc-600' 
                          : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'
                      }`}
                      aria-pressed={isSelected}
                      suppressHydrationWarning
                    >
                      {isSelected && (
                        <div
                          style={{
                            position: 'absolute',
                            left: '0px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '2px',
                            height: '100%',
                            background: color,
                            borderRadius: '0 2px 2px 0',
                            pointerEvents: 'none',
                          }}
                        ></div>
                      )}
                      <div className={`text-[10px] sm:text-xs relative z-10 text-center transition-colors leading-tight ${
                        isSelected ? 'text-zinc-200' : 'text-zinc-500'
                      }`}>
                        {sub.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="ml-2 mr-2 sm:ml-6 sm:mr-6 mb-4 space-y-3">
          {error && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-3">
            {/* Monto y Fecha en la misma fila */}
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
              
              {/* Descripción en desktop (tercera columna) */}
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
            
            {/* Descripción en móvil (fila separada) */}
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
          
          <button 
            type="submit"
            disabled={isSubmitting || (modalType === 'expense' ? !selectedCategoryId : !selectedDestinationAccountId)}
            className={`w-full py-3.5 sm:py-3 rounded-lg text-zinc-100 font-medium transition-all text-base sm:text-sm ${
              isSubmitting || (modalType === 'expense' ? !selectedCategoryId : !selectedDestinationAccountId)
                ? 'bg-zinc-600/20 cursor-not-allowed opacity-60'
                : modalType === 'expense'
                  ? 'bg-red-500/30 hover:bg-red-500/40 active:bg-red-500/50'
                  : 'bg-green-500/30 hover:bg-green-500/40 active:bg-green-500/50'
            }`}
          >
            {isSubmitting 
              ? 'Guardando...' 
              : modalType === 'expense'
                ? 'Guardar Gasto'
                : 'Guardar Ingreso'
            }
          </button>
          
          {/* Botón Cancelar solo en móviles */}
          <button 
            type="button"
            onClick={onClose}
            className="w-full py-3.5 rounded-lg text-zinc-300 font-medium transition-all text-base bg-zinc-800/30 hover:bg-zinc-800/50 active:bg-zinc-800/60 border border-zinc-700 sm:hidden"
          >
            Cancelar
          </button>
        </form>
        </div>
      </div>
    </div>
  )
}
