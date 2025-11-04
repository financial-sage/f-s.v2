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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
            {selectedCategory ? 'Detalle de categoría' : 'Selecciona una categoría para ver detalles'}
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Iconos de categorías en el lado izquierdo */}
        <div className="lg:col-span-1">
          <div className="dark:bg-white/5 rounded-md p-4 shadow-lg">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Categorías</h3>
            {categories.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                No hay categorías
              </div>
            ) : (
              <div className="grid grid-cols-4 lg:grid-cols-2 gap-3">
                {categories.map((category) => {
                  const categoryBudget = category.budget_limit || 0;
                  const categoryProgress = calculateProgress(category.total_expenses, categoryBudget);
                  const isSelected = selectedCategory === category.id;

                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all ${
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
                        />
                        {categoryBudget > 0 && (
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
                            categoryProgress >= 100 ? 'bg-red-500' :
                            categoryProgress >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}></div>
                        )}
                      </div>
                      <span className="text-xs text-gray-700 dark:text-gray-300 mt-2 text-center truncate w-full">
                        {category.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detalle de categoría seleccionada */}
        <div className="lg:col-span-3">
          <div className="dark:bg-white/2 p-3 sm:p-4 rounded-md shadow-lg">
            {!selectedCategory ? (
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Presupuesto</div>
                    <div className="text-lg font-medium text-blue-700 dark:text-blue-300">
                      {formatAmount(activeCategory.budget_limit || 0)}
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0) >= 100
                      ? 'bg-red-50 dark:bg-red-900/20'
                      : calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0) >= 80
                      ? 'bg-yellow-50 dark:bg-yellow-900/20'
                      : 'bg-green-50 dark:bg-green-900/20'
                  }`}>
                    <div className={`text-xs mb-1 ${
                      calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0) >= 100
                        ? 'text-red-600 dark:text-red-400'
                        : calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0) >= 80
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}>Gastado</div>
                    <div className={`text-lg font-medium ${
                      calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0) >= 100
                        ? 'text-red-700 dark:text-red-300'
                        : calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0) >= 80
                        ? 'text-yellow-700 dark:text-yellow-300'
                        : 'text-green-700 dark:text-green-300'
                    }`}>
                      {formatAmount(activeCategory.total_expenses)}
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg ${
                    (activeCategory.budget_limit || 0) - activeCategory.total_expenses >= 0
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <div className={`text-xs mb-1 ${
                      (activeCategory.budget_limit || 0) - activeCategory.total_expenses >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {(activeCategory.budget_limit || 0) - activeCategory.total_expenses >= 0 ? 'Disponible' : 'Sobregiro'}
                    </div>
                    <div className={`text-lg font-medium ${
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
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Progreso del presupuesto</span>
                      <span className={`text-sm font-medium ${getProgressColor(
                        calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0)
                      )}`}>
                        {calculateProgress(activeCategory.total_expenses, activeCategory.budget_limit || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
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
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Subcategorías</h3>
                  {activeCategory.subcategories.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                      No hay subcategorías para esta categoría
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {activeCategory.subcategories.map((subcategory) => {
                        return (
                          <li 
                            key={subcategory.id} 
                            className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                                {subcategory.name}
                              </span>
                              {subcategory.total_expenses > 0 && activeCategory.total_expenses > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                      className="h-2 rounded-full bg-blue-500"
                                      style={{ 
                                        width: `${(subcategory.total_expenses / activeCategory.total_expenses) * 100}%` 
                                      }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                    {((subcategory.total_expenses / activeCategory.total_expenses) * 100).toFixed(0)}%
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end ml-4">
                              <span className="text-sm font-medium text-gray-800 dark:text-white">
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
