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
  onAccountChange?: (newAccountId: string) => void;
  onTransactionSaved?: () => void;
  onDashboardUpdate?: () => void;
  onTransactionComplete?: () => void;
}

// Usar un estado global para el modal
let modalState = {
  isOpen: false,
  id: null as string | null
};

export default function AccountTransactionModal({ 
  accountId, 
  categories: propCategories, 
  type = 'expense', 
  onAccountChange, 
  onTransactionSaved, 
  onDashboardUpdate,
  onTransactionComplete 
}: AccountTransactionModalProps) {
  const blendy = useRef<Blendy | null>(null)
  const [showModal, setShowModal] = useState(() => modalState.isOpen && modalState.id === accountId)
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
              modalState.isOpen = false;
              modalState.id = null;
              setShowModal(false);
            })
          }}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
          categoryExpenses={categoryExpenses}
          modalType={type}
          accountId={accountId}
          currencyContext={currencyContext}
          onAccountChange={onAccountChange}
          onTransactionSaved={onTransactionSaved}
          onDashboardUpdate={onDashboardUpdate}
          onTransactionComplete={onTransactionComplete}
          modalType={type}
          accountId={accountId}
          currencyContext={currencyContext}
          onAccountChange={onAccountChange}
          onTransactionSaved={onTransactionSaved}
          onDashboardUpdate={onDashboardUpdate}
          onTransactionComplete={onTransactionComplete}
          type={type}
          accountId={accountId}
          currencyContext={currencyContext}
          onAccountChange={onAccountChange}
          onTransactionSaved={onTransactionSaved}
          onDashboardUpdate={onDashboardUpdate}
        />, document.body)
      }
      <IconCircleButton
        data-blendy-from={`modal-transaction-${type}`}
        onClick={() => {
          modalState.isOpen = true;
          modalState.id = accountId;
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

function Modal({ 
  onClose, 
  categories, 
  selectedCategoryId, 
  setSelectedCategoryId, 
  categoryExpenses, 
  modalType = 'expense', 
  accountId, 
  currencyContext, 
  onAccountChange, 
  onTransactionSaved, 
  onDashboardUpdate,
  onTransactionComplete 
}: ModalProps) {
  const [account, setAccount] = useState<Account | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAccount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const accounts = await getUserAccounts(session.user.id);
        if (accounts.data && Array.isArray(accounts.data)) {
          const selectedAccount = accounts.data.find((acc: Account) => acc.id === accountId);
          if (selectedAccount) setAccount(selectedAccount);
        }
      } catch (err) {
        console.error('Error cargando cuenta:', err);
      }
    };
    loadAccount();
  }, [accountId, currencyContext.currency]); // Agregamos la moneda como dependencia

  // Helper: convierte hex a rgba con alpha
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent form submission if no category is selected
    if (!selectedCategoryId) {
      setError('Por favor selecciona una categoría');
      return;
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

      const newTransaction: NewTransaction = {
        amount: parseFloat(amount),
        category_id: selectedCategoryId,
        account_id: accountId,
        description: note || undefined,
        type: modalType,
        date: new Date().toISOString()
      };

      const result = await addTransaction(session.user.id, newTransaction);
      
      if (result.error) {
        setError(result.error.message);
        return;
      }

      // Llamar a todas las funciones de actualización
      if (onTransactionSaved) {
        onTransactionSaved();
      }
      
      // Llamar al callback para mantener la tarjeta activa
      if (onTransactionComplete) {
        onTransactionComplete();
      }
      
      // Disparar evento de actualización del dashboard
      const updateEvent = new CustomEvent('dashboard:update', {
        detail: {
          accountId: accountId,
          type: modalType
        }
      });
      window.dispatchEvent(updateEvent);

      // Limpiar el formulario y cerrar el modal
      setAmount('');
      setNote('');
      setSelectedCategoryId(null);
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
    <div className="fixed inset-0 bg-black/70 z-40">
      <div className="modal z-50 border border-zinc-700" style={{ background: "var(--background-gradient)" }} data-blendy-to={`modal-transaction-${modalType}`}>
        <div className="modal__header border-b border-zinc-700">
          <h2 className="text-zinc-400">Agregar {modalType === 'expense' ? 'gasto' : 'ingreso'}</h2>
          <button className="modal__close" onClick={onClose}></button>
        </div>
        <div className="modal__content">
          <div className="mb-4">
            Desde:
            <div className="dark:bg-black/5 p-2 rounded-md grid lg:grid-cols-2 gap-2">
              {/* Future: select account */}
              <div className="text-zinc-400 dark:bg-white/5 rounded-md">
                {account ? (
                  <span className="flex items-center justify-center gap-2 p-2">
                    <i style={{color : `${account.color}`}} className={`fas ${account.icon} text-zinc-400 dark:bg-black/20 p-2 rounded-md`}></i>
                    <span className="text-sm opacity-75"><b>{account.name}</b>({currencyContext.formatAmount(account.balance)})</span>
                  </span>
                ) : (
                  'Cargando cuenta...'
                )}
              </div>
              <div className="flex items-center justify-center max-w-15">
                <AccountSelectorModal 
                  type={modalType}
                  currentAccountId={accountId}
                  onAccountSelect={(newAccountId) => {
                    // TODO: Implementar la lógica para cambiar la cuenta seleccionada
                    console.log('Cambiando a cuenta:', newAccountId);
                    // Aquí deberías actualizar el estado o manejar el cambio de cuenta
                    if (onAccountChange) {
                      onAccountChange(newAccountId);
                    }
                  }}
                />
              </div>
            </div>
          </div>
          {categories.length === 0 && <p className="text-zinc-400">No hay categorías disponibles. Por favor, crea una categoría primero.</p>}
          {categories.length > 0 && (
            <div className="grid md:grid-cols-7 lg:grid-cols-7 gap-2 dark:text-zinc-400 m-2">
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
                    className={`relative overflow-hidden flex flex-col items-center dark:bg-white/5 dark:hover:bg-white/10 pt-2 rounded-lg cursor-pointer border-2 transition-all ${isSelected ? 'ring-2 ring-offset-2' : ''}`}
                    style={{ borderColor: isSelected ? option.color : 'transparent', boxShadow: isSelected ? `0 0 0 6px ${option.color}22` : undefined }}
                    aria-pressed={isSelected}
                    aria-checked={isSelected}
                  >
                    {/* Background soft layer */}
                    <div style={{ position: 'absolute', inset: 0, background: hexToRgba(option.color, 0.06), pointerEvents: 'none' }}></div>

                    {/* Spent layer from bottom up */}
                    {limit > 0 && (
                      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${percent}%`, background: hexToRgba(option.color, 0.28), pointerEvents: 'none', transition: 'height 300ms ease' }} />
                    )}

                    <div className="text-2xl relative z-10"><CategoryIcon iconName={option.icon ?? 'default'} color={option.color} /></div>
                    <div className="text-sm mt-1 relative z-10">{option.name}</div>
                    {/* {limit > 0 && (
                      <div className="text-xs mt-1 relative z-10 text-zinc-300">{`Gastado: ${spent} / ${limit} (${percent}%)`}</div>
                    )} */}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="ml-6 mr-6 mb-4 space-y-2">
          {error && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm">
              {error}
            </div>
          )}
          
          <Input 
            placeholder="Cantidad" 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus 
          />
          
          <Input 
            placeholder="Descripción" 
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          
          <button 
            type="submit"
            disabled={isSubmitting || !selectedCategoryId}
            className={`w-full pt-2 pb-2 rounded-full text-zinc-300 transition-colors ${
              isSubmitting || !selectedCategoryId
                ? 'bg-zinc-600/20 cursor-not-allowed'
                : modalType === 'expense'
                  ? 'bg-red-500/20 hover:bg-red-500/30'
                  : 'bg-green-500/20 hover:bg-green-500/30'
            }`}
          >
            {isSubmitting 
              ? 'Guardando...' 
              : modalType === 'expense'
                ? 'Guardar Gasto'
                : 'Guardar Ingreso'
            }
          </button>
        </form>
      </div>
    </div>
  )
}
