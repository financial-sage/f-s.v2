'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase/client';
import { updateTransactionWithBalanceAdjustment, deleteTransactionWithBalanceAdjustment } from '@/src/lib/supabase/transactions';
import { CategoryIcon } from '@/src/components/categories/CategoryIcons';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { Input, Loader } from '@/src/components/common';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  type: 'income' | 'expense';
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
}

interface Account {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string | null;
  is_active: boolean;
}

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
  const { currency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [amount, setAmount] = useState(Math.abs(transaction.amount));
  const [description, setDescription] = useState(transaction.description || '');
  const [date, setDate] = useState(transaction.date.split('T')[0]);
  const [categoryId, setCategoryId] = useState(transaction.category_id || '');
  const [subcategoryId, setSubcategoryId] = useState(transaction.subcategory_id || '');
  const [accountId, setAccountId] = useState(transaction.account_id || '');
  const [destinationAccountId, setDestinationAccountId] = useState(transaction.destination_account_id || '');
  const [status, setStatus] = useState<'pending' | 'completed' | 'canceled'>(transaction.status);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  // Cargar subcategorías cuando cambie la categoría
  useEffect(() => {
    if (categoryId) {
      loadSubcategories(categoryId);
    } else {
      setSubcategories([]);
      setSubcategoryId('');
    }
  }, [categoryId]);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Cargar categorías
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${session.user.id},is_default.eq.true`)
        .order('name', { ascending: true });

      if (categoriesData) {
        setCategories(categoriesData as Category[]);
      }

      // Cargar cuentas
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (accountsData) {
        setAccounts(accountsData as Account[]);
      }

      // Cargar subcategorías si hay categoría seleccionada
      if (transaction.category_id) {
        await loadSubcategories(transaction.category_id);
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
    }
  };

  const loadSubcategories = async (catId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', catId)
        .eq('user_id', session.user.id)
        .order('name', { ascending: true });

      if (data) {
        setSubcategories(data as Subcategory[]);
      }
    } catch (err) {
      console.error('Error cargando subcategorías:', err);
    }
  };

  const getFilteredCategories = () => {
    if (transaction.type === 'transfer') return [];
    return categories.filter(c => c.type === transaction.type);
  };

  const getFilteredAccounts = () => {
    if (transaction.type === 'expense') {
      // Para gastos, excluir cuentas de inversión y ahorro
      return accounts.filter(a => !['investments', 'savings'].includes(a.type));
    }
    // Para ingresos y transferencias, todas las cuentas
    return accounts;
  };

  const getDestinationAccounts = () => {
    // Para transferencias, excluir la cuenta de origen
    return accounts.filter(a => a.id !== accountId);
  };

  const validateChanges = () => {
    // Validar monto
    if (amount <= 0) {
      alert('El monto debe ser mayor a cero');
      return false;
    }

    // Validar cambio significativo de monto (>50%)
    const originalAmount = Math.abs(transaction.amount);
    if (Math.abs(amount - originalAmount) > originalAmount * 0.5) {
      return 'confirmation'; // Necesita confirmación
    }

    // Validar que la subcategoría pertenezca a la categoría
    if (subcategoryId && categoryId) {
      const subcategory = subcategories.find(s => s.id === subcategoryId);
      if (subcategory && subcategory.category_id !== categoryId) {
        alert('La subcategoría no pertenece a la categoría seleccionada');
        return false;
      }
    }

    // Validar transferencias
    if (transaction.type === 'transfer') {
      if (!accountId || !destinationAccountId) {
        alert('Debes seleccionar cuenta de origen y destino');
        return false;
      }
      if (accountId === destinationAccountId) {
        alert('No se puede transferir a la misma cuenta');
        return false;
      }
    } else {
      // Para gastos e ingresos, debe tener cuenta
      if (!accountId) {
        alert('Debes seleccionar una cuenta');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateChanges();
    if (validation === false) return;

    // Si necesita confirmación y no la ha dado aún
    if (validation === 'confirmation' && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('No hay sesión activa');
        return;
      }

      const updates: Record<string, string | number | null> = {
        amount,
        description: description || null,
        date: new Date(date).toISOString(),
        status,
      };

      // Solo incluir campos relevantes según el tipo
      if (transaction.type !== 'transfer') {
        updates.category_id = categoryId || null;
        updates.subcategory_id = subcategoryId || null;
        updates.account_id = accountId || null;
      } else {
        updates.account_id = accountId || null;
        updates.destination_account_id = destinationAccountId || null;
      }

      const result = await updateTransactionWithBalanceAdjustment(
        transaction.id,
        session.user.id,
        updates
      );

      if (result.error) {
        alert(result.error.message);
        return;
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error('Error al actualizar:', err);
      alert('Error al actualizar la transacción');
    } finally {
      setLoading(false);
    }
  };

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

      onSaved();
      onClose();
    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('Error al eliminar la transacción');
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = () => {
    switch (transaction.type) {
      case 'expense': return 'Gasto';
      case 'income': return 'Ingreso';
      case 'transfer': return 'Transferencia';
      default: return transaction.type;
    }
  };

  const getTypeBadgeColor = () => {
    switch (transaction.type) {
      case 'expense': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'income': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'transfer': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  // Helper: convierte hex a rgba con alpha
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
      <div 
        className="modal z-50 border border-zinc-700 max-w-3xl" 
        style={{ background: "var(--background-gradient)" }} 
        suppressHydrationWarning
      >
        {/* Header */}
        <div className="modal__header border-b border-zinc-700">
          <div className="flex items-center gap-3">
            <i className="fas fa-edit text-xl text-blue-400"></i>
            <h2 className="text-zinc-400">Editar Transacción</h2>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor()}`}>
              {getTypeLabel()}
            </span>
          </div>
          <button className="modal__close" onClick={onClose}></button>
        </div>

        {/* Content */}
        <div className="modal__content">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Monto, Fecha y Descripción */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder={`Monto (${String(currency)})`}
                type="number"
                step="0.01"
                value={String(amount)}
                onChange={(e) => setAmount(parseFloat(e.target.value))}
                required
              />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Input
                placeholder="Descripción"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Categorías (Solo para gastos e ingresos) */}
            {transaction.type !== 'transfer' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Categoría {categoryId && '✓'}
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
                    {getFilteredCategories().map((cat) => {
                      const isSelected = categoryId === cat.id;
                      return (
                        <div
                          key={cat.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setCategoryId(cat.id);
                            setSubcategoryId(''); // Reset subcategory
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setCategoryId(cat.id);
                              setSubcategoryId('');
                            }
                          }}
                          className={`group relative overflow-hidden flex flex-col items-center p-3 rounded-lg cursor-pointer border transition-all ${
                            isSelected 
                              ? 'bg-zinc-800/50 border-zinc-600' 
                              : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'
                          }`}
                          aria-pressed={isSelected}
                          suppressHydrationWarning
                        >
                          {/* Sutil fondo de color solo cuando está seleccionado */}
                          {isSelected && (
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: `linear-gradient(135deg, ${hexToRgba(cat.color, 0.03)}, ${hexToRgba(cat.color, 0.08)})`,
                                pointerEvents: 'none',
                              }}
                            ></div>
                          )}
                          
                          {/* Borde superior sutil con el color */}
                          {isSelected && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: '0px',
                                right: '0px',
                                height: '2px',
                                background: cat.color,
                                pointerEvents: 'none',
                              }}
                            ></div>
                          )}
                          
                          <div className="text-2xl relative z-10 transition-all">
                            {/* Icono en gris cuando NO está seleccionado, color cuando SÍ */}
                            <CategoryIcon 
                              iconName={cat.icon ?? 'default'} 
                              color={isSelected ? cat.color : '#71717a'} 
                            />
                          </div>
                          <div className={`text-xs mt-1 relative z-10 text-center transition-colors ${
                            isSelected ? 'text-zinc-200' : 'text-zinc-500'
                          }`}>
                            {cat.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Subcategorías */}
                {subcategories.length > 0 && categoryId && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                      Subcategoría {subcategoryId && '✓'}
                    </label>
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {subcategories.map((sub) => {
                        const isSelected = subcategoryId === sub.id;
                        const selectedCategory = categories.find(c => c.id === categoryId);
                        const color = selectedCategory?.color || '#6366f1';
                        
                        return (
                          <div
                            key={sub.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSubcategoryId(sub.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setSubcategoryId(sub.id);
                              }
                            }}
                            className={`relative overflow-hidden flex items-center justify-center p-2.5 rounded-lg cursor-pointer border transition-all ${
                              isSelected 
                                ? 'bg-zinc-800/40 border-zinc-600' 
                                : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'
                            }`}
                            aria-pressed={isSelected}
                            suppressHydrationWarning
                          >
                            {/* Indicador izquierdo con el color cuando está seleccionado */}
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
                            <div className={`text-xs relative z-10 text-center transition-colors ${
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
              </>
            )}

            {/* Cuenta(s) */}
            {transaction.type === 'transfer' ? (
              <div className="space-y-4">
                {/* Cuenta Origen */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Cuenta Origen * {accountId && '✓'}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {getFilteredAccounts().map((acc) => {
                      const isSelected = accountId === acc.id;
                      return (
                        <div
                          key={acc.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setAccountId(acc.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setAccountId(acc.id);
                            }
                          }}
                          className={`relative overflow-hidden flex flex-col items-center p-3 rounded-lg cursor-pointer border transition-all ${
                            isSelected 
                              ? 'bg-zinc-800/50 border-zinc-600' 
                              : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'
                          }`}
                          aria-pressed={isSelected}
                          suppressHydrationWarning
                        >
                          {/* Borde superior con color cuando está seleccionado */}
                          {isSelected && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: '0px',
                                right: '0px',
                                height: '2px',
                                background: acc.color,
                                pointerEvents: 'none',
                              }}
                            ></div>
                          )}
                          <i
                            className={`fas ${acc.icon} text-2xl relative z-10 mb-1 transition-colors`}
                            style={{ color: isSelected ? acc.color : '#71717a' }}
                          ></i>
                          <div className={`text-xs relative z-10 text-center transition-colors ${
                            isSelected ? 'text-zinc-200' : 'text-zinc-500'
                          }`}>
                            {acc.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cuenta Destino */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Cuenta Destino * {destinationAccountId && '✓'}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {getDestinationAccounts().map((acc) => {
                      const isSelected = destinationAccountId === acc.id;
                      return (
                        <div
                          key={acc.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setDestinationAccountId(acc.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setDestinationAccountId(acc.id);
                            }
                          }}
                          className={`relative overflow-hidden flex flex-col items-center p-3 rounded-lg cursor-pointer border transition-all ${
                            isSelected 
                              ? 'bg-zinc-800/50 border-zinc-600' 
                              : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'
                          }`}
                          aria-pressed={isSelected}
                          suppressHydrationWarning
                        >
                          {/* Borde superior con color cuando está seleccionado */}
                          {isSelected && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: '4px',
                                right: '4px',
                                height: '2px',
                                background: acc.color,
                                pointerEvents: 'none',
                              }}
                            ></div>
                          )}
                          <i
                            className={`fas ${acc.icon} text-2xl relative z-10 mb-1 transition-colors`}
                            style={{ color: isSelected ? acc.color : '#71717a' }}
                          ></i>
                          <div className={`text-xs relative z-10 text-center transition-colors ${
                            isSelected ? 'text-zinc-200' : 'text-zinc-500'
                          }`}>
                            {acc.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Cuenta * {accountId && '✓'}
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {getFilteredAccounts().map((acc) => {
                    const isSelected = accountId === acc.id;
                    return (
                      <div
                        key={acc.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setAccountId(acc.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setAccountId(acc.id);
                          }
                        }}
                        className={`relative overflow-hidden flex flex-col items-center p-3 rounded-lg cursor-pointer border transition-all ${
                          isSelected 
                            ? 'bg-zinc-800/50 border-zinc-600' 
                            : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'
                        }`}
                        aria-pressed={isSelected}
                        suppressHydrationWarning
                      >
                        {/* Borde superior con color cuando está seleccionado */}
                        {isSelected && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: '0px',
                              right: '0px',
                              height: '2px',
                              background: acc.color,
                              pointerEvents: 'none',
                            }}
                          ></div>
                        )}
                        <i
                          className={`fas ${acc.icon} text-2xl relative z-10 mb-1 transition-colors`}
                          style={{ color: isSelected ? acc.color : '#71717a' }}
                        ></i>
                        <div className={`text-xs relative z-10 text-center transition-colors ${
                          isSelected ? 'text-zinc-200' : 'text-zinc-500'
                        }`}>
                          {acc.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Estado de la transacción
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setStatus('pending')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setStatus('pending');
                  }}
                  className={`relative overflow-hidden flex items-center justify-center gap-2 p-3 rounded-lg cursor-pointer border transition-all ${
                    status === 'pending'
                      ? 'bg-zinc-800/50 border-zinc-600'
                      : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'
                  }`}
                >
                  {status === 'pending' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: '#facc15',
                        pointerEvents: 'none',
                      }}
                    ></div>
                  )}
                  <i className={`fas fa-clock transition-colors ${
                    status === 'pending' ? 'text-yellow-400' : 'text-zinc-500'
                  }`}></i>
                  <span className={`text-sm transition-colors ${
                    status === 'pending' ? 'text-zinc-200' : 'text-zinc-500'
                  }`}>Pendiente</span>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setStatus('completed')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setStatus('completed');
                  }}
                  className={`relative overflow-hidden flex items-center justify-center gap-2 p-3 rounded-lg cursor-pointer border transition-all ${
                    status === 'completed'
                      ? 'bg-zinc-800/50 border-zinc-600'
                      : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'
                  }`}
                >
                  {status === 'completed' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: '#22c55e',
                        pointerEvents: 'none',
                      }}
                    ></div>
                  )}
                  <i className={`fas fa-check-circle transition-colors ${
                    status === 'completed' ? 'text-green-400' : 'text-zinc-500'
                  }`}></i>
                  <span className={`text-sm transition-colors ${
                    status === 'completed' ? 'text-zinc-200' : 'text-zinc-500'
                  }`}>Completado</span>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setStatus('canceled')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setStatus('canceled');
                  }}
                  className={`relative overflow-hidden flex items-center justify-center gap-2 p-3 rounded-lg cursor-pointer border transition-all ${
                    status === 'canceled'
                      ? 'bg-zinc-800/50 border-zinc-600'
                      : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'
                  }`}
                >
                  {status === 'canceled' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: '#ef4444',
                        pointerEvents: 'none',
                      }}
                    ></div>
                  )}
                  <i className={`fas fa-times-circle transition-colors ${
                    status === 'canceled' ? 'text-red-400' : 'text-zinc-500'
                  }`}></i>
                  <span className={`text-sm transition-colors ${
                    status === 'canceled' ? 'text-zinc-200' : 'text-zinc-500'
                  }`}>Cancelado</span>
                </div>
              </div>
            </div>

            {/* Advertencia de cambio grande */}
            {showConfirmation && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <i className="fas fa-exclamation-triangle text-yellow-400 text-xl mt-0.5"></i>
                  <div>
                    <h4 className="font-medium text-yellow-400 mb-1">
                      Cambio significativo detectado
                    </h4>
                    <p className="text-sm text-yellow-200/80">
                      Estás cambiando el monto en más del 50%. ¿Estás seguro de continuar?
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Advertencia de eliminación */}
            {showDeleteConfirm && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <i className="fas fa-exclamation-circle text-red-400 text-xl mt-0.5"></i>
                  <div>
                    <h4 className="font-medium text-red-400 mb-1">
                      ¿Estás seguro de eliminar esta transacción?
                    </h4>
                    <p className="text-sm text-red-200/80">
                      Esta acción no se puede deshacer. Los balances de las cuentas se ajustarán automáticamente.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              <button
                type="button"
                onClick={handleDelete}
                className={`px-4 py-2 rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  showDeleteConfirm
                    ? 'border-red-500 bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'border-zinc-600 text-zinc-400 hover:bg-zinc-700/50 hover:text-red-400 hover:border-red-500/50'
                }`}
                disabled={loading}
              >
                {showDeleteConfirm ? (
                  <>
                    <i className="fas fa-check"></i>
                    Confirmar
                  </>
                ) : (
                  <>
                    <i className="fas fa-trash"></i>
                    Eliminar
                  </>
                )}
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
                className="px-4 py-2 rounded-full border border-zinc-600 text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`px-4 py-2 rounded-full text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  transaction.type === 'expense'
                    ? 'bg-red-500/20 hover:bg-red-500/30'
                    : transaction.type === 'income'
                    ? 'bg-green-500/20 hover:bg-green-500/30'
                    : 'bg-blue-500/20 hover:bg-blue-500/30'
                }`}
                disabled={loading || showDeleteConfirm}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader size={16} color="#ffffff" />
                    <span>Guardando...</span>
                  </div>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Guardar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
