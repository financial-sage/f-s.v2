"use client";

import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/src/lib/supabase/client';
import { CurrencyContext } from '@/src/contexts/CurrencyContext';
import { useTransactionContext } from '@/src/contexts/TransactionContext';
import { CategoryIcon } from '@/src/components/categories/CategoryIcons';
import AccountSelectorModal from '@/src/components/accounts/modal/AccountSelectorModal';
import { QuickCategoryForm } from '@/src/components/categories/QuickCategoryForm';
import { Category, getUserCategories } from '@/src/lib/supabase/categories';
import { getUserAccounts } from '@/src/lib/supabase/accounts';
import { addTransaction, getCategoryExpenses, NewTransaction } from '@/src/lib/supabase/transactions';
import { deleteTransactionWithBalanceAdjustment } from '@/src/lib/supabase/transactions';
import { showDeleteConfirm, showError } from '@/src/utils/sweetAlert';
import type { Account } from '@/src/types/types';

interface QuickTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'add' | 'edit';
    type: 'expense' | 'income';
    accountId?: string; // origen para gastos
    preselectedAccountId?: string; // destino para ingresos (futuro)
    transactionId?: string;
    initialData?: {
        amount: number;
        description?: string;
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

interface Subcategory { id: string; category_id: string; name: string; }

// Teclas del teclado numérico / expresiones básicas
type KeyType = 'digit' | 'operator' | 'action';
interface KeyDef { label: string; type: KeyType; value?: string; action?: () => void; className?: string; }

export default function QuickTransactionModal({
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
}: QuickTransactionModalProps) {
    const currencyContext = useContext(CurrencyContext);
    const { refetch: refetchTransactions } = useTransactionContext();
    const [categories, setCategories] = useState<Category[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
    const [selectedDestinationAccountId, setSelectedDestinationAccountId] = useState<string | null>(null);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [categoryExpenses, setCategoryExpenses] = useState<Record<string, number>>({});
    const [expression, setExpression] = useState<string>('');
    const [computedAmount, setComputedAmount] = useState<number>(0);
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [showDateInput, setShowDateInput] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [account, setAccount] = useState<Account | null>(null);
    const [currentAccountId, setCurrentAccountId] = useState<string | undefined>(accountId);
    const [showCategoryForm, setShowCategoryForm] = useState(false);

    if (!currencyContext) throw new Error('Currency context must be used within CurrencyProvider');
    const { currency, formatAmount } = currencyContext;

    // Preselección para ingresos y modo edición
    useEffect(() => {
        if (preselectedAccountId && type === 'income') {
            setSelectedDestinationAccountId(preselectedAccountId);
        }
        if (mode === 'edit' && initialData) {
            setSelectedCategoryId(initialData.categoryId || null);
            setSelectedSubcategoryId(initialData.subcategoryId || null);
            setCurrentAccountId(initialData.accountId || accountId);
            if (type === 'income') setSelectedDestinationAccountId(initialData.destinationAccountId || null);
            setExpression(String(Math.abs(initialData.amount ?? 0)));
            const d = initialData.date?.split('T')[0] || new Date().toISOString().split('T')[0];
            setDate(d);
        }
    }, [preselectedAccountId, type, mode, initialData, accountId]);

    // IMPORTANTE: cuando se abre el modal en móvil desde otra cuenta, sincronizar siempre
    useEffect(() => {
        if (!isOpen) return;
        // En alta, forzamos que el origen sea la cuenta actual que viene de props
        if (mode === 'add' && accountId) {
            setCurrentAccountId(accountId);
        }
        // En edición, preferimos el accountId del initialData si existe
        if (mode === 'edit') {
            setCurrentAccountId(initialData?.accountId || accountId);
            if (type === 'income') {
                setSelectedDestinationAccountId(initialData?.destinationAccountId || preselectedAccountId || null);
            }
        }
    }, [isOpen, mode, accountId, initialData, type, preselectedAccountId]);

    const reloadCategories = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const categoriesResult = await getUserCategories(session.user.id);
            if (categoriesResult.data && Array.isArray(categoriesResult.data)) setCategories(categoriesResult.data);
            const expensesResult = await getCategoryExpenses(session.user.id);
            if (!expensesResult.error && expensesResult.data) setCategoryExpenses(expensesResult.data);
        } catch (e) { console.error('Error recargando categorías', e); }
    };

    // Cargar datos cuando abre
    useEffect(() => {
        if (!isOpen) return;
        const load = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
                const categoriesResult = await getUserCategories(session.user.id);
                if (categoriesResult.data && Array.isArray(categoriesResult.data)) {
                    setCategories(categoriesResult.data as Category[]);
                }
                const accountsResult = await getUserAccounts(session.user.id);
                if (accountsResult.data && Array.isArray(accountsResult.data)) {
                    const accData = accountsResult.data as Account[];
                    setAccounts(accData);
                    const accToLoad = currentAccountId || accountId;
                    if (accToLoad) {
                        const selected = accData.find((a: Account) => a.id === accToLoad);
                        if (selected) setAccount(selected);
                    }
                }
                const expensesResult = await getCategoryExpenses(session.user.id);
                if (!expensesResult.error && expensesResult.data) setCategoryExpenses(expensesResult.data);
            } catch (e) { console.error('Error cargando datos', e); }
        };
        load();
    }, [isOpen, accountId, currentAccountId, currency]);

    // Subcategorías
    useEffect(() => {
        if (!selectedCategoryId) { setSubcategories([]); setSelectedSubcategoryId(null); return; }
        const loadSubs = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;
                const { data, error } = await supabase
                    .from('subcategories')
                    .select('*')
                    .eq('category_id', selectedCategoryId)
                    .eq('user_id', session.user.id)
                    .order('name');
                if (error) throw error;
                setSubcategories(data || []);
            } catch (e) { console.error('Error subcategorías', e); }
        };
        loadSubs();
    }, [selectedCategoryId]);

    // Evaluar expresión
    useEffect(() => {
        if (!expression) { setComputedAmount(0); return; }
        try {
            const sanitized = expression
                .replace(/€/g, '')
                .replace(/x/gi, '*')
                .replace(/÷/g, '/')
                .replace(/,/g, '.')
                .replace(/[^0-9+\-*/.]/g, '');
            if (!/^[0-9+\-*/.]+$/.test(sanitized)) { setComputedAmount(0); return; }
            // Evitar operadores consecutivos
            if (/[*+\-/]{2,}/.test(sanitized)) { setComputedAmount(0); return; }
            // Evaluación segura básica
            // eslint-disable-next-line no-new-func
            const result = Function(`"use strict"; return (${sanitized || '0'})`)();
            const amount = typeof result === 'number' && isFinite(result) ? Math.abs(result) : 0;
            setComputedAmount(amount);
        } catch { setComputedAmount(0); }
    }, [expression]);

    const append = (val: string) => setExpression(prev => {
        // Evitar iniciar con operador o punto
        if (['+', '-', '*', '/', '.'].includes(val) && prev === '') return prev;
        // Evitar operadores consecutivos o repetir punto inmediatamente
        if (['+', '-', '*', '/', '.'].includes(val) && /[+\-*/.]$/.test(prev)) return prev;
        // Limitar longitud para prevenir expresiones excesivas
        if (prev.length > 40) return prev;
        return prev + val;
    });
    const backspace = () => setExpression(prev => prev.slice(0, -1));
    const clearAll = () => setExpression('');

    const handleDelete = async () => {
        if (!transactionId) return;
        try {
            const confirmed = await showDeleteConfirm('esta transacción');
            if (!confirmed) return;
            setIsSubmitting(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { showError('No hay sesión activa', 'Error'); return; }
            const result = await deleteTransactionWithBalanceAdjustment(transactionId, session.user.id);
            if (result.error) { showError(result.error.message, 'Error al eliminar'); return; }
            window.dispatchEvent(new Event('dashboard:update'));
            await refetchTransactions();
            if (onSaved) onSaved();
            onClose();
        } catch (e) {
            console.error(e);
            showError('Error al eliminar la transacción');
        } finally { setIsSubmitting(false); }
    };

    const handleSave = async () => {
        if (type === 'expense' && !selectedCategoryId) { setError('Selecciona una categoría'); return; }
        if (computedAmount <= 0) { setError('Ingresa un monto válido'); return; }
        try {
            setIsSubmitting(true); setError(null);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { setError('No hay sesión'); return; }
            const selectedDate = new Date(date);
            const now = new Date();
            selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
            if (mode === 'add') {
                const newTx: NewTransaction = {
                    amount: computedAmount,
                    category_id: type === 'expense' ? (selectedCategoryId || undefined) : undefined,
                    subcategory_id: type === 'expense' ? (selectedSubcategoryId || undefined) : undefined,
                    account_id: type === 'income' ? selectedDestinationAccountId! : currentAccountId!,
                    description: undefined,
                    type,
                    date: selectedDate.toISOString(),
                    status: 'completed'
                };
                const result = await addTransaction(session.user.id, newTx);
                if (result.error) { setError(result.error.message); return; }
            } else {
                if (!transactionId) { setError('ID de transacción no proporcionado'); return; }
                const updates: Record<string, string | number | null> = {
                    amount: computedAmount,
                    description: null,
                    date: selectedDate.toISOString(),
                    status: 'completed'
                };
                updates.category_id = type === 'expense' ? (selectedCategoryId || null) : null;
                updates.subcategory_id = type === 'expense' ? (selectedSubcategoryId || null) : null;
                updates.account_id = type === 'income' ? (selectedDestinationAccountId || null) : (currentAccountId || null);
                const { updateTransactionWithBalanceAdjustment } = await import('@/src/lib/supabase/transactions');
                const result = await updateTransactionWithBalanceAdjustment(transactionId, session.user.id, updates);
                if (result.error) { setError(result.error.message); return; }
            }
            window.dispatchEvent(new CustomEvent('dashboard:update', { detail: { accountId: currentAccountId, type } }));
            await refetchTransactions();
            if (onSaved) await onSaved();
            if (onTransactionComplete) onTransactionComplete();
            clearAll(); setSelectedCategoryId(null); setSelectedSubcategoryId(null); onClose();
        } catch (e) { console.error(e); setError('Error guardando'); } finally { setIsSubmitting(false); }
    };

    const hexToRgba = (hex: string, alpha = 1) => {
        try { const h = hex.replace('#', ''); const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); const r = (bigint >> 16) & 255; const g = (bigint >> 8) & 255; const b = bigint & 255; return `rgba(${r},${g},${b},${alpha})`; } catch { return `rgba(99,102,241,${alpha})`; }
    };

    // Detectar mobile (solo renderizar si mobile)
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 640 : true;
    if (!isOpen || !isMobile) return null;

    // Definición de teclas (sin acciones directas para calendar y guardar que se manejan fuera)
    const keys: KeyDef[] = [
        { label: '÷', type: 'operator', value: '/' },
        { label: '7', type: 'digit', value: '7' },
        { label: '8', type: 'digit', value: '8' },
        { label: '9', type: 'digit', value: '9' },
        { label: 'x', type: 'operator', value: '*' },
        { label: '4', type: 'digit', value: '4' },
        { label: '5', type: 'digit', value: '5' },
        { label: '6', type: 'digit', value: '6' },
        { label: '-', type: 'operator', value: '-' },
        { label: '1', type: 'digit', value: '1' },
        { label: '2', type: 'digit', value: '2' },
        { label: '3', type: 'digit', value: '3' },
        { label: '+', type: 'operator', value: '+' },
        { label: '€', type: 'action', action: () => { } },
        { label: '0', type: 'digit', value: '0' },
        { label: ',', type: 'operator', value: '.' },
    ];

    return createPortal(
        <div className="fixed inset-0 z-60 sm:hidden" suppressHydrationWarning>
            <div className="flex flex-col h-[100dvh] w-full" style={{ WebkitTapHighlightColor: 'transparent', background: 'var(--background-gradient)' }}>
                {/* Header nativo */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                    <button onClick={onClose} aria-label="Cerrar" className="text-zinc-400 active:scale-95 transition-transform">
                        <i className="fas fa-chevron-left"></i>
                    </button>
                    <h2 className="text-sm font-medium text-zinc-300">{mode === 'edit' ? (type === 'expense' ? 'Editar gasto' : 'Editar ingreso') : (type === 'expense' ? 'Nuevo gasto' : 'Nuevo ingreso')}</h2>
                    <div className="w-5" />
                </div>
                {/* Scrollable content arriba (más espacio para categorías) */}
                <div className="flex-1 overflow-y-auto px-3 pt-3 pb-2">
                    {/* Cuenta origen */}
                    {type === 'expense' && (
                        <div className="mb-4">
                            <div className="flex items-center gap-2 dark:bg-black/5 p-2 rounded-md">
                                <div className="flex-1 flex items-center justify-center gap-2 text-zinc-400 dark:bg-white/5 rounded-md p-2 min-w-0">
                                    {account ? (
                                        <>
                                            <i className={`fas ${account.icon || 'fa-wallet'} text-xl`} style={{ color: account.color }} />
                                            <div className="flex min-w-0 items-center gap-2 ">
                                                <span className="text-sm truncate">{account.name}</span>
                                                <span className="text-xs text-zinc-500">{formatAmount(account.balance)}</span>
                                            </div>
                                        </>
                                    ) : <span className="text-sm">Cargando...</span>}
                                </div>
                                <AccountSelectorModal
                                    type={type}
                                    currentAccountId={currentAccountId || ''}
                                    onAccountSelect={async (newAccountId) => {
                                        const selectedAcc = accounts.find(a => a.id === newAccountId);
                                        if (selectedAcc) { setAccount(selectedAcc); setCurrentAccountId(newAccountId); if (onAccountChange) onAccountChange(newAccountId); }
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Cuenta destino (ingreso) */}
                    {type === 'income' && (
                        <div className="mb-4">
                            <div className="flex items-center gap-2 dark:bg-black/5 p-2 rounded-md">
                                <div className="flex-1 flex items-center justify-center gap-2 text-zinc-400 dark:bg-white/5 rounded-md p-2 min-w-0">
                                    {selectedDestinationAccountId ? (
                                        (() => {
                                            const dest = accounts.find(a => a.id === selectedDestinationAccountId);
                                            return dest ? (
                                                <>
                                                    <i className={`fas ${dest.icon || 'fa-wallet'} text-xl`} style={{ color: dest.color }} />
                                                    <div className="flex min-w-0 items-center gap-2 ">
                                                        <span className="text-sm truncate">{dest.name}</span>
                                                        <span className="text-xs text-zinc-500">{formatAmount(dest.balance)}</span>
                                                    </div>
                                                </>
                                            ) : <span className="text-sm">Selecciona cuenta</span>;
                                        })()
                                    ) : (
                                        <span className="text-sm">Selecciona cuenta</span>
                                    )}
                                </div>
                                <AccountSelectorModal
                                    type={type}
                                    currentAccountId={selectedDestinationAccountId || ''}
                                    showAllAccounts
                                    onAccountSelect={(newId) => setSelectedDestinationAccountId(newId)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Categorías */}
                    {type === 'expense' && (
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium text-zinc-400">Categorías:</label>
                                <button type="button" onClick={() => setShowCategoryForm(true)} className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                                    <i className="fas fa-plus text-[10px]"></i> Nueva
                                </button>
                            </div>
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-1.5 sm:gap-2">
                                {categories.filter(c => c.type === type).map(option => {
                                    const isSelected = selectedCategoryId === option.id;
                                    const spent = categoryExpenses[option.id] || 0;
                                    const limit = option.budget_limit || 0;
                                    const percent = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
                                    return (
                                        <div key={option.id} role="button" tabIndex={0}
                                            onClick={() => setSelectedCategoryId(isSelected ? null : option.id)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCategoryId(isSelected ? null : option.id); } }}
                                            className={`relative overflow-hidden flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg cursor-pointer border transition-all ${isSelected ? 'bg-zinc-800/50 border-zinc-600' : 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'}`}
                                        >
                                            {limit > 0 && (
                                                <div className="absolute inset-0 opacity-20" style={{ background: `linear-gradient(to top, ${hexToRgba(option.color || '#6366f1', 0.5)} ${percent}%, transparent ${percent}%)` }} />
                                            )}
                                            <div className="relative z-10">
                                                <CategoryIcon iconName={option.icon || 'wallet'} color={option.color || '#6366f1'} size={window.innerWidth < 640 ? 20 : 28} />
                                            </div>
                                            <span className="relative z-10 text-[10px] sm:text-xs text-center mt-1 leading-tight line-clamp-2">{option.name}</span>
                                            {limit > 0 && <span className="relative z-10 text-[8px] sm:text-[10px] text-zinc-500 mt-0.5">{percent}%</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Subcategorías */}
                    {type === 'expense' && subcategories.length > 0 && selectedCategoryId && (
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-zinc-400 mb-2">Subcategoría {selectedSubcategoryId && '✓'}</label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5 sm:gap-2">
                                {subcategories.map(sub => {
                                    const isSelected = selectedSubcategoryId === sub.id;
                                    const parent = categories.find(c => c.id === sub.category_id);
                                    return (
                                        <div key={sub.id} role="button" tabIndex={0}
                                            onClick={() => setSelectedSubcategoryId(isSelected ? null : sub.id)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedSubcategoryId(isSelected ? null : sub.id); } }}
                                            className={`relative flex items-center justify-center p-2 rounded-lg cursor-pointer border transition-all ${isSelected ? 'border-zinc-600 ring-2 ring-blue-500/50' : 'border-zinc-800 hover:bg-zinc-800/30 hover:border-zinc-700'}`}
                                            style={{ background: isSelected ? hexToRgba(parent?.color || '#6366f1', 0.15) : hexToRgba(parent?.color || '#6366f1', 0.05) }}
                                        >
                                            <span className="text-[10px] sm:text-xs text-zinc-300 text-center leading-tight line-clamp-2">{sub.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Display de monto y teclado */}
                </div>
                {/* Footer fijo: calendario, monto y teclado pegados abajo */}
                <div className="px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 border-t border-zinc-800 bg-black/30 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-zinc-300">{type === 'expense' ? 'Gasto' : 'Ingreso'}</span>
                            <button type="button" onClick={() => setShowDateInput(v => !v)} className="text-zinc-400 hover:text-blue-400 transition-colors" aria-label="Cambiar fecha">
                                <i className="far fa-calendar-alt"></i>
                            </button>
                            {showDateInput && (
                                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-zinc-900/80 border border-zinc-700 rounded px-2 py-1 text-[11px]" />
                            )}
                        </div>
                        <button type="button" onClick={clearAll} className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors">Limpiar</button>
                    </div>
                    <div className="text-center text-3xl font-semibold text-zinc-100 tracking-tight mb-2 min-h-[2.4rem]">
                        {formatAmount(computedAmount)}
                    </div>
                    {error && <div className="mb-2 p-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-[11px]">{error}</div>}
                    <div className="grid grid-cols-4 gap-1.5">
                        {keys.map((k, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => k.action ? k.action() : append(k.value || k.label)}
                                className={`h-12 rounded-md flex items-center justify-center text-base font-medium bg-zinc-900/50 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/60 active:bg-zinc-700/60 transition-all ${k.type === 'operator' ? 'text-blue-400' : 'text-zinc-200'}`}
                            >
                                {k.label}
                            </button>
                        ))}
                        {/* Backspace */}
                        <button
                            type="button"
                            onClick={backspace}
                            className="h-12 rounded-md flex items-center justify-center text-base font-medium bg-zinc-900/50 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/60 active:bg-zinc-700/60 text-zinc-300"
                        >
                            <i className="fas fa-backspace"></i>
                        </button>
                        {/* Eliminar (solo edición) */}
                        {mode === 'edit' && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={isSubmitting}
                                className="h-12 rounded-md flex items-center justify-center text-base font-medium border text-red-400 bg-red-500/10 border-red-500/40 hover:bg-red-500/20 hover:border-red-500/60 active:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Eliminar
                            </button>
                        )}
                        {/* Guardar (ocupa tres columnas) */}
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSubmitting || (type === 'expense' ? (!selectedCategoryId || !currentAccountId) : (!selectedDestinationAccountId)) || computedAmount <= 0}
                            className={`${mode === 'edit' ? 'col-span-2' : 'col-span-3'} h-12 rounded-md flex items-center justify-center text-base font-semibold bg-blue-500/50 hover:bg-blue-500/60 active:bg-blue-500/70 border border-blue-500/70 disabled:opacity-40 disabled:cursor-not-allowed text-white`}
                        >
                            {isSubmitting ? (mode === 'edit' ? 'Actualizando...' : 'Guardando...') : (mode === 'edit' ? 'Actualizar' : 'Guardar')}
                        </button>
                    </div>
                </div>
            </div>
            {showCategoryForm && (
                <QuickCategoryForm type={type} onClose={() => setShowCategoryForm(false)} onSuccess={async () => { await reloadCategories(); setShowCategoryForm(false); }} />
            )}
        </div>,
        document.body
    );
}
