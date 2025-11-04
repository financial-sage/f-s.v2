"use client";

import React, { useState } from 'react';
import { useExpenseTracking } from '@/src/hooks/useExpenseTracking';
import { CategoryIcon } from '@/src/components/categories/CategoryIcons';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { Select } from '@/src/components/common';

export default function ExpensesTrackingPage() {
  const {
    categories,
    isLoading,
    error,
    selectedMonth,
    setSelectedMonth,
    totalBudget,
    totalExpenses,
    budgetProgress
  } = useExpenseTracking();

  const { formatAmount } = useCurrency();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Cargando gastos...</div>;
  }

  if (error) {
    return <div className="text-red-600 dark:text-red-400">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header con indicadores financieros */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl lg:text-2xl text-gray-800 dark:text-white" style={{ fontWeight: '300' }}>
            Seguimiento de Gastos
          </h1>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
          <div className="flex items-center justify-between sm:justify-start sm:space-x-4">
            <div className="text-center sm:text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400">Presupuesto</div>
              <div className="text-lg font-medium text-blue-600 dark:text-blue-400">
                {formatAmount(totalBudget)}
              </div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
            <div className="text-center sm:text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400">Gastado</div>
              <div className={`text-lg font-medium ${getProgressColor(budgetProgress)}`}>
                {formatAmount(totalExpenses)}
              </div>
            </div>
            <div className="hidden sm:block w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
            <div className="text-center sm:text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400">Disponible</div>
              <div className={`text-lg font-medium ${totalBudget - totalExpenses >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatAmount(totalBudget - totalExpenses)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center w-full lg:justify-between border-b border-gray-300 dark:border-gray-600 pb-4 space-y-4 lg:space-y-0">
        <div className="flex items-center justify-center lg:justify-start">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Gastos por categorías y subcategorías
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-4">
          <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-2 lg:gap-4">
            <div className="w-full sm:w-auto">
              <Select
                value={selectedMonth.getFullYear().toString()}
                onChange={(e) => {
                  const newDate = new Date(selectedMonth);
                  newDate.setFullYear(Number(e.target.value));
                  setSelectedMonth(newDate);
                }}
                options={yearOptions.map((year) => ({
                  value: year.toString(),
                  label: year.toString()
                }))}
              />
            </div>
            <div className="w-full sm:w-auto">
              <Select
                value={selectedMonth.getMonth().toString()}
                onChange={(e) => {
                  const newDate = new Date(selectedMonth);
                  newDate.setMonth(Number(e.target.value));
                  setSelectedMonth(newDate);
                }}
                options={monthOptions}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de categorías */}
      <div className="dark:bg-white/2 p-3 sm:p-4 rounded-md shadow-lg">
        {categories.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No hay categorías de gastos para este período
          </div>
        ) : (
          <ul className="space-y-3">
            {categories.map((category) => {
              const categoryBudget = category.budget_limit || 0;
              const categoryProgress = calculateProgress(category.total_expenses, categoryBudget);
              const isExpanded = expandedCategories.has(category.id);
              const hasSubcategories = category.subcategories.length > 0;

              return (
                <li key={category.id} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0">
                  <div 
                    className={`flex items-center justify-between p-2 rounded transition-colors ${
                      hasSubcategories ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5' : ''
                    }`}
                    onClick={() => hasSubcategories && toggleCategory(category.id)}
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <CategoryIcon
                          iconName={category.icon || "wallet"}
                          color={category.color || "#6366f1"}
                        />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm sm:text-base text-gray-800 dark:text-white font-medium truncate">
                          {category.name}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          {hasSubcategories && (
                            <>
                              <span>{category.subcategories.length} subcategorías</span>
                              <span>•</span>
                            </>
                          )}
                          {categoryBudget > 0 && (
                            <span className={getProgressColor(categoryProgress)}>
                              {categoryProgress.toFixed(0)}% usado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm sm:text-base font-medium ${
                          categoryBudget > 0 ? getProgressColor(categoryProgress) : 'text-gray-800 dark:text-white'
                        }`}>
                          {formatAmount(category.total_expenses)}
                        </span>
                        {categoryBudget > 0 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            de {formatAmount(categoryBudget)}
                          </span>
                        )}
                      </div>
                      {hasSubcategories && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subcategorías expandibles */}
                  {isExpanded && hasSubcategories && (
                    <div className="ml-12 mt-2 space-y-2">
                      {category.subcategories.map((subcategory) => {
                        return (
                          <div key={subcategory.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-white/5 rounded">
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                {subcategory.name}
                              </span>
                              {subcategory.total_expenses > 0 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {((subcategory.total_expenses / category.total_expenses) * 100).toFixed(0)}% del total de la categoría
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end ml-3">
                              <span className="text-sm font-medium text-gray-800 dark:text-white">
                                {formatAmount(subcategory.total_expenses)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
