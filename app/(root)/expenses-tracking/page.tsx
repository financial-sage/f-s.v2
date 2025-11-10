"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useExpenseTracking } from '@/src/hooks/useExpenseTracking';
import { CategoryIcon } from '@/src/components/categories/CategoryIcons';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { Select, Loader } from '@/src/components/common';
import { supabase } from '@/src/lib/supabase/client';
import EditTransactionModal from '@/src/components/transactions/modals/EditTransactionModal';
import DayCarousel from '@/src/components/common/DayCarousel';
import EditAccountModal from '@/src/components/accounts/modal/EditAccountModal';
import type { Account } from '@/src/types/types';

interface Transaction {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  category_id: string | null;
  subcategory_id: string | null;
  account_id: string | null;
  destination_account_id: string | null;
  type: 'income' | 'expense' | 'transfer';
  status: 'pending' | 'completed' | 'canceled';
  account: {
    id: string;
    name: string;
  } | null;
}

interface AccountWithExpenses extends Account {
  total_expenses?: number;
}

export default function ExpensesTrackingPage() {
  const searchParams = useSearchParams();
  const accountIdFromUrl = searchParams.get('accountId');

  const {
    categories,
    isLoading,
    error,
    selectedMonth,
    setSelectedMonth,
    totalBudget,
    totalExpenses,
    budgetProgress,
    refresh
  } = useExpenseTracking();

  const { formatAmount } = useCurrency();
  const [viewMode, setViewMode] = useState<'categories' | 'accounts'>(accountIdFromUrl ? 'accounts' : 'categories');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(accountIdFromUrl);
  const [showAllTransactions, setShowAllTransactions] = useState(true);
  const [accounts, setAccounts] = useState<AccountWithExpenses[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [accountSubcategoryExpenses, setAccountSubcategoryExpenses] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterByDay, setFilterByDay] = useState(false);
  const [filterByYear, setFilterByYear] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Generar opciones de años (últimos 3 años y próximos 1)
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);

  // Opciones de meses
  const monthOptions = [
    { value: '0', label: 'Enero' },
    { value: '1', label: 'Febrero' },
    { value: '2', label: 'Marzo' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Mayo' },
    { value: '5', label: 'Junio' },
    { value: '6', label: 'Julio' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Septiembre' },
    { value: '9', label: 'Octubre' },
    { value: '10', label: 'Noviembre' },
    { value: '11', label: 'Diciembre' },
  ];

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const calculateProgress = (expenses: number, budget: number) => {
    if (budget === 0) return 0;
    return (expenses / budget) * 100;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'text-red-600 dark:text-red-400';
    if (progress >= 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  // Obtener la categoría seleccionada
  const activeCategory = selectedCategory 
    ? categories.find(cat => cat.id === selectedCategory)
    : null;

  // Obtener la cuenta seleccionada
  const activeAccount = selectedAccount
    ? accounts.find(acc => acc.id === selectedAccount)
    : null;

  // Función para cargar cuentas (fuera de useEffect para poder reutilizar)
  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Calcular rango de fechas según el modo
      let startDate: Date;
      let endDate: Date;
      
      if (filterByYear) {
        // Todo el año seleccionado
        startDate = new Date(selectedMonth.getFullYear(), 0, 1); // 1 de enero
        endDate = new Date(selectedMonth.getFullYear(), 11, 31, 23, 59, 59); // 31 de diciembre
      } else {
        // Solo el mes seleccionado
        startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
        endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);
      }

      // Obtener cuentas del usuario
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (accountsError) throw accountsError;

      // Obtener gastos por cuenta
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('account_id, amount')
        .eq('user_id', session.user.id)
        .eq('type', 'expense')
        .eq('status', 'completed')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());

      if (transactionsError) throw transactionsError;

      // Agrupar gastos por cuenta
      const expensesByAccount: Record<string, number> = {};
      (transactionsData || []).forEach(t => {
        if (t.account_id) {
          expensesByAccount[t.account_id] = (expensesByAccount[t.account_id] || 0) + Math.abs(t.amount);
        }
      });

      console.log('📊 Gastos por cuenta calculados:', {
        modo: filterByYear ? 'AÑO COMPLETO' : 'MES',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        transacciones: transactionsData?.length || 0,
        expensesByAccount
      });

      // Combinar datos
      const accountsWithExpenses = (accountsData || []).map(account => ({
        ...account,
        total_expenses: expensesByAccount[account.id] || 0
      }));

      console.log('💳 Cuentas con gastos:', accountsWithExpenses.map(a => ({
        name: a.name,
        balance: a.balance,
        total_expenses: a.total_expenses,
        estimado: a.balance - (a.total_expenses || 0)
      })));

      setAccounts(accountsWithExpenses);
    } catch (err) {
      console.error('Error cargando cuentas:', err);
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  }, [selectedMonth, filterByYear]);

  // Cargar cuentas con sus gastos del mes
  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Función para cargar transacciones (fuera de useEffect para poder reutilizar)
  const loadTransactions = useCallback(async () => {
    // Si showAllTransactions está activo, cargar todas las transacciones
    // En modo categorías, requiere categoría seleccionada o showAll
    // En modo cuentas, requiere cuenta seleccionada o showAll
    if (!showAllTransactions) {
      if (viewMode === 'categories' && !selectedCategory) {
        setTransactions([]);
        return;
      }
      if (viewMode === 'accounts' && !selectedAccount) {
        setTransactions([]);
        return;
      }
    }

    setLoadingTransactions(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No hay sesión activa');
        setLoadingTransactions(false);
        return;
      }

      // Calcular rango de fechas según el modo
      let startDate: Date;
      let endDate: Date;
      
      if (filterByYear) {
        // Todo el año seleccionado
        startDate = new Date(selectedMonth.getFullYear(), 0, 1); // 1 de enero
        endDate = new Date(selectedMonth.getFullYear(), 11, 31, 23, 59, 59); // 31 de diciembre
      } else {
        // Solo el mes seleccionado
        startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
        endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);
      }

      console.log('Cargando transacciones para:', {
        userId: session.user.id,
        viewMode,
        modo: filterByYear ? 'AÑO COMPLETO' : (filterByDay ? 'DÍA' : 'MES'),
        categoryId: selectedCategory,
        subcategoryId: selectedSubcategory,
        accountId: selectedAccount,
        filterByDay,
        filterByYear,
        selectedDate: filterByDay ? selectedDate.toISOString() : null,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      // Primero obtener las transacciones sin join
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('type', 'expense')
        .eq('status', 'completed')
        .order('date', { ascending: false });

      // Aplicar filtro de fecha según el modo
      if (filterByDay && !filterByYear) {
        // Filtrar por día específico (solo si no está en modo año)
        const dayStart = new Date(selectedDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(selectedDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        query = query
          .gte('date', dayStart.toISOString())
          .lte('date', dayEnd.toISOString());
      } else {
        // Filtrar por mes completo o año completo
        query = query
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString());
      }

      // Aplicar filtros según el modo (solo si no es "ver todas")
      if (!showAllTransactions) {
        if (viewMode === 'categories' && selectedCategory) {
          query = query.eq('category_id', selectedCategory);
          
          // Filtrar por subcategoría si está seleccionada
          if (selectedSubcategory) {
            query = query.eq('subcategory_id', selectedSubcategory);
          }
        }

        if (viewMode === 'accounts' && selectedAccount) {
          query = query.eq('account_id', selectedAccount);
          
          // Filtro cruzado: si también hay categoría seleccionada
          if (selectedCategory) {
            query = query.eq('category_id', selectedCategory);
            
            // Y subcategoría si aplica
            if (selectedSubcategory) {
              query = query.eq('subcategory_id', selectedSubcategory);
            }
          }
        }
      }

      const { data: transactionsData, error: transactionsError } = await query;

      console.log('Resultado de transacciones:', { transactionsData, transactionsError });

      if (transactionsError) {
        console.error('Error de Supabase:', transactionsError);
        throw transactionsError;
      }

      if (!transactionsData || transactionsData.length === 0) {
        console.log('No se encontraron transacciones');
        setTransactions([]);
        setLoadingTransactions(false);
        return;
      }

      // Obtener las cuentas relacionadas
      const accountIds = [...new Set(transactionsData.map(t => t.account_id).filter(Boolean))];
      console.log('Account IDs a buscar:', accountIds);

      let accountsMap: Record<string, { id: string; name: string }> = {};
      
      if (accountIds.length > 0) {
        const { data: accountsData, error: accountsError } = await supabase
          .from('accounts')
          .select('id, name')
          .in('id', accountIds);

        console.log('Resultado de accounts:', { accountsData, accountsError });

        if (!accountsError && accountsData) {
          accountsMap = accountsData.reduce((acc, account) => {
            acc[account.id] = account;
            return acc;
          }, {} as Record<string, { id: string; name: string }>);
        }
      }
      
      // Transform data to match Transaction interface
      const transformedData = transactionsData.map((item: Transaction) => ({
        id: item.id,
        amount: item.amount,
        description: item.description,
        date: item.date,
        category_id: item.category_id,
        subcategory_id: item.subcategory_id,
        account_id: item.account_id,
        destination_account_id: item.destination_account_id,
        type: item.type || 'expense',
        status: item.status || 'completed',
        account: item.account_id && accountsMap[item.account_id] ? {
          id: accountsMap[item.account_id].id,
          name: accountsMap[item.account_id].name
        } : null
      }));
      
      console.log('Transacciones transformadas:', transformedData);
      setTransactions(transformedData);

      // Si estamos en modo cuentas, calcular gastos por subcategoría para esta cuenta
      if (viewMode === 'accounts' && selectedAccount && !showAllTransactions) {
        const subcatExpenses: Record<string, number> = {};
        transactionsData.forEach((t: Transaction) => {
          if (t.subcategory_id) {
            subcatExpenses[t.subcategory_id] = (subcatExpenses[t.subcategory_id] || 0) + Math.abs(t.amount);
          }
        });
        setAccountSubcategoryExpenses(subcatExpenses);
      } else {
        setAccountSubcategoryExpenses({});
      }
    } catch (err) {
      console.error('Error cargando transacciones:', err);
      setTransactions([]);
      setAccountSubcategoryExpenses({});
    } finally {
      setLoadingTransactions(false);
    }
  }, [selectedCategory, selectedSubcategory, selectedAccount, selectedMonth, viewMode, showAllTransactions, filterByDay, selectedDate, filterByYear]);

  // Cargar transacciones cuando se selecciona una categoría, subcategoría o cuenta
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Resetear subcategoría al cambiar de categoría
  useEffect(() => {
    setSelectedSubcategory(null);
  }, [selectedCategory]);

  // Limpiar selecciones al cambiar de modo
  useEffect(() => {
    // Solo limpiar si hay algo seleccionado del otro modo
    if (viewMode === 'categories') {
      setSelectedAccount(null);
    }
    // En modo cuentas, NO limpiar la categoría ya que sirve como filtro cruzado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <Loader />
        <div className="text-sm text-gray-600 dark:text-gray-400">Cargando gastos...</div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-600 dark:text-red-400">Error: {error}</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header con indicadores financieros */}
      <div className="flex flex-col space-y-3 sm:space-y-4">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <h1 className="text-lg sm:text-xl lg:text-2xl text-gray-800 dark:text-white" style={{ fontWeight: '300' }}>
            Seguimiento de Gastos
          </h1>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="text-center">
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Presupuesto</div>
            <div className="text-sm sm:text-base lg:text-lg font-medium text-blue-600 dark:text-blue-400">
              {formatAmount(totalBudget)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Gastado</div>
            <div className={`text-sm sm:text-base lg:text-lg font-medium ${getProgressColor(budgetProgress)}`}>
              {formatAmount(totalExpenses)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Disponible</div>
            <div className={`text-sm sm:text-base lg:text-lg font-medium ${totalBudget - totalExpenses >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatAmount(totalBudget - totalExpenses)}
            </div>
          </div>
        </div>
      </div>

      {/* Filtros de fecha - Ahora arriba, antes de los tabs */}
      <div className="flex flex-col gap-3 bg-zinc-900/30 border border-zinc-800 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth.getFullYear()}
            onChange={(e) => {
              const newDate = new Date(selectedMonth);
              newDate.setFullYear(Number(e.target.value));
              setSelectedMonth(newDate);
            }}
            className="w-20 sm:w-24 px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-xs sm:text-sm"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <select
            value={selectedMonth.getMonth()}
            onChange={(e) => {
              const newDate = new Date(selectedMonth);
              newDate.setMonth(Number(e.target.value));
              setSelectedMonth(newDate);
            }}
            disabled={filterByYear}
            className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-xs sm:text-sm ${
              filterByYear ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {monthOptions.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setFilterByYear(!filterByYear);
              // Si activamos año completo, desactivar filtro por día
              if (!filterByYear) {
                setFilterByDay(false);
              }
            }}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-medium whitespace-nowrap ${
              filterByYear
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-zinc-900/50 border border-zinc-700 text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <i className={`fas ${filterByYear ? 'fa-calendar-check' : 'fa-calendar'} text-xs`}></i>
            <span className="hidden sm:inline">{filterByYear ? 'Año completo' : 'Ver año'}</span>
          </button>
          <button
            onClick={() => {
              setFilterByDay(!filterByDay);
              // Si activamos día, desactivar año completo
              if (!filterByDay) {
                setFilterByYear(false);
              }
            }}
            disabled={filterByYear}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all text-xs sm:text-sm font-medium whitespace-nowrap ${
              filterByDay
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : filterByYear
                ? 'bg-zinc-900/50 border border-zinc-700 text-zinc-500 cursor-not-allowed opacity-50'
                : 'bg-zinc-900/50 border border-zinc-700 text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <i className={`fas ${filterByDay ? 'fa-calendar-day' : 'fa-calendar-alt'} text-xs`}></i>
            <span className="hidden sm:inline">{filterByDay ? 'Por día' : 'Por día'}</span>
          </button>
        </div>
        
        {filterByDay && !filterByYear && (
          <div className="pt-2 border-t border-zinc-800">
            <DayCarousel
              selectedDate={selectedDate}
              onDateChange={(date) => {
                setSelectedDate(date);
                if (date.getMonth() !== selectedMonth.getMonth() || date.getFullYear() !== selectedMonth.getFullYear()) {
                  setSelectedMonth(date);
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Tabs - Ancho completo */}
      <div className="flex flex-col w-full space-y-4">
        <div className="flex items-center w-full border-b-2 border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setViewMode('categories')}
            className={`flex-1 relative py-2.5 sm:py-3 font-medium text-xs sm:text-sm transition-all duration-300 ${
              viewMode === 'categories'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            Por Categorías
            {viewMode === 'categories' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 transform transition-all duration-300" />
            )}
          </button>
          <button
            onClick={() => setViewMode('accounts')}
            className={`flex-1 relative py-2.5 sm:py-3 font-medium text-xs sm:text-sm transition-all duration-300 ${
              viewMode === 'accounts'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
            }`}
          >
            Por Cuentas
            {viewMode === 'accounts' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 transform transition-all duration-300" />
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Primera columna: Categorías o Cuentas */}
        <div className="lg:col-span-3">
          <div className="dark:bg-white/5 rounded-lg p-3 shadow-lg sticky top-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                {viewMode === 'categories' ? 'Categorías' : 'Cuentas'}
              </h3>
              <button
                onClick={() => {
                  setShowAllTransactions(!showAllTransactions);
                  if (!showAllTransactions) {
                    setSelectedCategory(null);
                    setSelectedSubcategory(null);
                    setSelectedAccount(null);
                  }
                }}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                  showAllTransactions
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                Ver Todas
              </button>
            </div>
            
            {viewMode === 'categories' ? (
              // Vista de Categorías
              categories.length === 0 ? (
                <div className="text-center py-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  No hay categorías
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
                  {categories.map((category) => {
                    const categoryBudget = category.budget_limit || 0;
                    const categoryProgress = calculateProgress(category.total_expenses, categoryBudget);
                    const isSelected = selectedCategory === category.id;

                    return (
                      <button
                        key={category.id}
                        onClick={() => {
                          setShowAllTransactions(false);
                          setSelectedCategory(isSelected ? null : category.id);
                          if (isSelected) setSelectedSubcategory(null);
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                          isSelected 
                            ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 dark:ring-blue-400' 
                            : 'hover:bg-gray-50 dark:hover:bg-white/10'
                        }`}
                        title={category.name}
                      >
                        <div className="relative">
                          <CategoryIcon
                            iconName={category.icon || "wallet"}
                            color={category.color || "#6366f1"}
                            size={28}
                          />
                          {categoryBudget > 0 && (
                            <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${
                              categoryProgress >= 100 ? 'bg-red-500' :
                              categoryProgress >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}></div>
                          )}
                        </div>
                        <span className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 mt-1.5 text-center truncate w-full">
                          {category.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              // Vista de Cuentas
              loadingAccounts ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <Loader size={28} />
                  <div className="text-xs text-gray-500 dark:text-gray-400">Cargando cuentas...</div>
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-6 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  No hay cuentas
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
                  {accounts.map((account) => {
                    const isSelected = selectedAccount === account.id;

                    return (
                      <button
                        key={account.id}
                        onClick={() => {
                          setShowAllTransactions(false);
                          setSelectedAccount(isSelected ? null : account.id);
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${
                          isSelected 
                            ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500 dark:ring-blue-400' 
                            : 'hover:bg-gray-50 dark:hover:bg-white/10'
                        }`}
                        title={account.name}
                      >
                        <i 
                          className={`fas ${account.icon || 'fa-wallet'} text-2xl sm:text-3xl lg:text-2xl`}
                          style={{ color: account.color }}
                        />
                        <span className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 mt-1.5 text-center truncate w-full">
                          {account.name}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {formatAmount(account.total_expenses || 0)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* Segunda columna: Detalle de categoría o cuenta */}
        <div className="lg:col-span-4">
          <div className="dark:bg-white/2 p-3 rounded-lg shadow-lg">
            {showAllTransactions ? (
              // Vista de "Ver Todas"
              <div>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h2 className="text-xl font-medium text-gray-800 dark:text-white">
                      Todas las Transacciones
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAllTransactions(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 sm:p-4 rounded-lg">
                    <div className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 mb-0.5 sm:mb-1">Total Presupuesto</div>
                    <div className="text-sm sm:text-lg font-medium text-blue-700 dark:text-blue-300">
                      {formatAmount(totalBudget)}
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 p-2.5 sm:p-4 rounded-lg">
                    <div className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 mb-0.5 sm:mb-1">Total Gastado</div>
                    <div className="text-sm sm:text-lg font-medium text-red-700 dark:text-red-300">
                      {formatAmount(totalExpenses)}
                    </div>
                  </div>
                  <div className={`p-2.5 sm:p-4 rounded-lg ${
                    totalBudget - totalExpenses >= 0
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-orange-50 dark:bg-orange-900/20'
                  }`}>
                    <div className={`text-[10px] sm:text-xs mb-0.5 sm:mb-1 ${
                      totalBudget - totalExpenses >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-orange-600 dark:text-orange-400'
                    }`}>
                      {totalBudget - totalExpenses >= 0 ? 'Disponible' : 'Sobregiro'}
                    </div>
                    <div className={`text-sm sm:text-lg font-medium ${
                      totalBudget - totalExpenses >= 0
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-orange-700 dark:text-orange-300'
                    }`}>
                      {formatAmount(Math.abs(totalBudget - totalExpenses))}
                    </div>
                  </div>
                </div>

                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <p className="text-sm">
                    Mostrando todas las transacciones del mes en la columna de la derecha
                  </p>
                </div>
              </div>
            ) : viewMode === 'categories' ? (
              // Vista de detalle de categoría
              !selectedCategory ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <div className="text-6xl mb-4">📊</div>
                  <p className="text-lg mb-2">Selecciona una categoría</p>
                  <p className="text-sm">Haz clic en una categoría de la izquierda para ver sus detalles</p>
                </div>
              ) : activeCategory ? (
              <div>
                {/* Header de categoría */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <CategoryIcon
                      iconName={activeCategory.icon || "wallet"}
                      color={activeCategory.color || "#6366f1"}
                    />
                    <div>
                      <h2 className="text-xl font-medium text-gray-800 dark:text-white">
                        {activeCategory.name}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {activeCategory.subcategories.length} subcategorías
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>

                {/* Resumen de categoría */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 sm:p-4 rounded-lg">
                    <div className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 mb-0.5 sm:mb-1">Presupuesto</div>
                    <div className="text-sm sm:text-lg font-medium text-blue-700 dark:text-blue-300">
                      {formatAmount(activeCategory.budget_limit || 0)}
                    </div>
                  </div>
                  <div className={`p-2.5 sm:p-4 rounded-lg ${
                    calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0) >= 100
                      ? 'bg-red-50 dark:bg-red-900/20'
                      : calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0) >= 80
                      ? 'bg-yellow-50 dark:bg-yellow-900/20'
                      : 'bg-green-50 dark:bg-green-900/20'
                  }`}>
                    <div className={`text-[10px] sm:text-xs mb-0.5 sm:mb-1 ${
                      calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0) >= 100
                        ? 'text-red-600 dark:text-red-400'
                        : calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0) >= 80
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>Gastado</div>
                    <div className={`text-sm sm:text-lg font-medium ${
                      calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0) >= 100
                        ? 'text-red-700 dark:text-red-300'
                        : calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0) >= 80
                        ? 'text-yellow-700 dark:text-yellow-300'
                        : 'text-green-700 dark:text-green-300'
                    }`}>
                      {formatAmount(activeCategory.total_expenses)}
                    </div>
                  </div>
                  <div className={`p-2.5 sm:p-4 rounded-lg ${
                    (activeCategory.budget_limit || 0) - activeCategory.total_expenses >= 0
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <div className={`text-[10px] sm:text-xs mb-0.5 sm:mb-1 ${
                      (activeCategory.budget_limit || 0) - activeCategory.total_expenses >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {(activeCategory.budget_limit || 0) - activeCategory.total_expenses >= 0 ? 'Disponible' : 'Sobregiro'}
                    </div>
                    <div className={`text-sm sm:text-lg font-medium ${
                      (activeCategory.budget_limit || 0) - activeCategory.total_expenses >= 0
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {formatAmount(Math.abs((activeCategory.budget_limit || 0) - activeCategory.total_expenses))}
                    </div>
                  </div>
                </div>

                {/* Barra de progreso */}
                {(activeCategory.budget_limit || 0) > 0 && (
                  <div className="mb-4 sm:mb-6">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Progreso del presupuesto</span>
                      <span className={`text-xs sm:text-sm font-medium ${getProgressColor(
                        calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0)
                      )}`}>
                        {calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 sm:h-3">
                      <div
                        className={`h-2.5 sm:h-3 rounded-full transition-all ${
                          calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0) >= 100
                            ? 'bg-red-600'
                            : calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0) >= 80
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ 
                          width: `${Math.min(
                            calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0), 
                            100
                          )}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Lista de subcategorías */}
                <div>
                  <div className="mb-2 sm:mb-3">
                    <h3 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Subcategorías</h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
                      Solo se muestran subcategorías con gastos
                    </p>
                  </div>
                  {activeCategory.subcategories.filter(sub => sub.total_expenses > 0).length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      No hay subcategorías con gastos para esta categoría
                    </div>
                  ) : (
                    <ul className="space-y-1.5 sm:space-y-2">
                      {activeCategory.subcategories
                        .filter(subcategory => subcategory.total_expenses > 0)
                        .map((subcategory) => {
                          const isSelected = selectedSubcategory === subcategory.id;
                        
                        return (
                          <li 
                            key={subcategory.id} 
                            onClick={() => setSelectedSubcategory(isSelected ? null : subcategory.id)}
                            className={`flex items-center justify-between py-2 sm:py-3 px-2.5 sm:px-4 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400 ring-2 ring-blue-500 dark:ring-blue-400'
                                : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                          >
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                                {subcategory.name}
                              </span>
                              {subcategory.total_expenses > 0 && activeCategory.total_expenses > 0 && (
                                <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
                                    <div
                                      className="h-1.5 sm:h-2 rounded-full bg-blue-500"
                                      style={{ 
                                        width: `${(subcategory.total_expenses / activeCategory.total_expenses) * 100}%` 
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                    {((subcategory.total_expenses / activeCategory.total_expenses) * 100).toFixed(0)}%
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end ml-3 sm:ml-4">
                              <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-white">
                                {formatAmount(subcategory.total_expenses)}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-red-600 dark:text-red-400">
                Categoría no encontrada
              </div>
            )
          ) : (
            // Vista de detalle de cuenta
            !selectedAccount ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <div className="text-6xl mb-4">💳</div>
                <p className="text-lg mb-2">Selecciona una cuenta</p>
                <p className="text-sm">Haz clic en una cuenta de la izquierda para ver sus detalles</p>
              </div>
            ) : activeAccount ? (
              <div>
                {/* Header de cuenta */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <i 
                      className={`fas ${activeAccount.icon || 'fa-wallet'} text-4xl`}
                      style={{ color: activeAccount.color }}
                    />
                    <div>
                      <h2 className="text-xl font-medium text-gray-800 dark:text-white">
                        {activeAccount.name}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Balance: {formatAmount(activeAccount.balance)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Botón para editar cuenta */}
                    <button
                      onClick={() => setEditingAccount(activeAccount)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                      title="Editar cuenta"
                    >
                      <i className="fas fa-edit text-lg"></i>
                    </button>
                    <button
                      onClick={() => setSelectedAccount(null)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Resumen de cuenta */}
                <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <div className="flex-1 bg-red-50 dark:bg-red-900/20 p-2.5 sm:p-4 rounded-lg">
                    <div className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 mb-0.5 sm:mb-1">Gastos del mes</div>
                    <div className="text-sm sm:text-lg font-medium text-red-700 dark:text-red-300">
                      {formatAmount(activeAccount.total_expenses || 0)}
                    </div>
                  </div>
                  <div className={`flex-1 p-2.5 sm:p-4 rounded-lg ${
                    activeAccount.balance - (activeAccount.total_expenses || 0) >= 0
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-orange-50 dark:bg-orange-900/20'
                  }`}>
                    <div className={`text-[10px] sm:text-xs mb-0.5 sm:mb-1 ${
                      activeAccount.balance - (activeAccount.total_expenses || 0) >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-orange-600 dark:text-orange-400'
                    }`}>
                      Balance estimado
                    </div>
                    <div className={`text-sm sm:text-lg font-medium ${
                      activeAccount.balance - (activeAccount.total_expenses || 0) >= 0
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-orange-700 dark:text-orange-300'
                    }`}>
                      {formatAmount(activeAccount.balance - (activeAccount.total_expenses || 0))}
                    </div>
                  </div>
                </div>

                {/* Filtro cruzado por categoría */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="mb-3">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Filtrar por categoría (opcional)
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Solo se muestran categorías que han generado gastos
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {categories
                      .filter(category => category.total_expenses > 0)
                      .slice(0, 8)
                      .map((category) => {
                        const isSelected = selectedCategory === category.id;
                        return (
                          <button
                            key={category.id}
                            onClick={() => {
                              setSelectedCategory(isSelected ? null : category.id);
                              if (isSelected) setSelectedSubcategory(null);
                            }}
                            className={`flex flex-col items-center p-2 rounded-lg transition-all ${
                              isSelected 
                                ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' 
                                : 'hover:bg-gray-100 dark:hover:bg-white/10'
                            }`}
                            title={category.name}
                          >
                            <CategoryIcon
                              iconName={category.icon || "wallet"}
                              color={category.color || "#6366f1"}
                              size={24}
                            />
                            <span className="text-xs text-gray-700 dark:text-gray-300 mt-1 text-center truncate w-full">
                              {category.name}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                  {selectedCategory && (
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setSelectedSubcategory(null);
                      }}
                      className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Limpiar filtro de categoría
                    </button>
                  )}
                </div>

                {/* Subcategorías si hay categoría seleccionada */}
                {selectedCategory && activeCategory && activeCategory.subcategories.filter(sub => {
                  // En modo cuentas, usar los gastos calculados específicamente para la cuenta
                  if (viewMode === 'accounts' && selectedAccount) {
                    return (accountSubcategoryExpenses[sub.id] || 0) > 0;
                  }
                  // En modo categorías, usar los gastos totales
                  return sub.total_expenses > 0;
                }).length > 0 && (
                  <div>
                    <div className="mb-3">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Filtrar por subcategoría (opcional)
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Solo se muestran subcategorías con gastos
                      </p>
                    </div>
                    <ul className="space-y-2">
                      {activeCategory.subcategories
                        .filter(subcategory => {
                          // En modo cuentas, usar los gastos calculados específicamente para la cuenta
                          if (viewMode === 'accounts' && selectedAccount) {
                            return (accountSubcategoryExpenses[subcategory.id] || 0) > 0;
                          }
                          // En modo categorías, usar los gastos totales
                          return subcategory.total_expenses > 0;
                        })
                        .map((subcategory) => {
                          const isSelected = selectedSubcategory === subcategory.id;
                          
                          return (
                            <li 
                              key={subcategory.id} 
                              onClick={() => setSelectedSubcategory(isSelected ? null : subcategory.id)}
                              className={`flex items-center justify-between py-2 px-3 rounded-lg border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400'
                                  : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-white/10'
                              }`}
                            >
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {subcategory.name}
                              </span>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-red-600 dark:text-red-400">
                Cuenta no encontrada
              </div>
            )
            )}
          </div>
        </div>

        {/* Columna de transacciones */}
        <div className="lg:col-span-5">
          <div className="dark:bg-white/2 p-3 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {showAllTransactions ? 'Todas las Transacciones' : 'Transacciones'}
                {!showAllTransactions && selectedSubcategory && activeCategory && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    ({activeCategory.subcategories.find(s => s.id === selectedSubcategory)?.name})
                  </span>
                )}
              </h3>
              {transactions.length > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {transactions.length} {transactions.length === 1 ? 'transacción' : 'transacciones'}
                </span>
              )}
            </div>

            {!showAllTransactions && ((viewMode === 'categories' && !selectedCategory) || (viewMode === 'accounts' && !selectedAccount)) ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <div className="text-6xl mb-4">💳</div>
                <p className="text-lg mb-2">
                  Selecciona {viewMode === 'categories' ? 'una categoría' : 'una cuenta'}
                </p>
                <p className="text-sm">Las transacciones aparecerán aquí</p>
              </div>
            ) : loadingTransactions ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader size={32} />
                <div className="text-sm text-gray-500 dark:text-gray-400">Cargando transacciones...</div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="mb-2">No hay transacciones</p>
                <p className="text-sm">
                  {viewMode === 'accounts' 
                    ? (selectedCategory 
                      ? `No hay transacciones en esta cuenta para la categoría seleccionada` 
                      : 'No hay transacciones para esta cuenta')
                    : (selectedSubcategory 
                      ? 'No hay transacciones para esta subcategoría'
                      : 'No hay transacciones para esta categoría')
                  }
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
                {transactions.map((transaction) => (
                  <li 
                    key={transaction.id} 
                    onClick={() => setEditingTransaction(transaction)}
                    className="cursor-pointer bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-lg transition-all p-2.5 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-xs sm:text-sm text-gray-800 dark:text-white font-medium truncate">
                          {transaction.description || 'Sin descripción'}
                        </span>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 mt-0.5">
                          <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                            {transaction.account?.name || 'Sin cuenta'}
                          </span>
                          <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">•</span>
                          <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(transaction.date)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
                          -{formatAmount(transaction.amount)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Modal de edición de transacción */}
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSaved={async () => {
            setEditingTransaction(null);
            // Recargar todos los datos actualizados
            await Promise.all([loadAccounts(), loadTransactions(), refresh()]);
          }}
        />
      )}

      {/* Modal de edición de cuenta */}
      {editingAccount && (
        <EditAccountModal
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSaved={async () => {
            setEditingAccount(null);
            // Recargar todos los datos actualizados
            await Promise.all([loadAccounts(), loadTransactions(), refresh()]);
          }}
        />
      )}
    </div>
  );
}
