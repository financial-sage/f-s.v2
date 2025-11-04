"use client";

import React, { useState } from 'react';
import { useExpenseTracking } from '@/src/hooks/useExpenseTracking';
import { CategoryIcon } from '@/src/components/categories/CategoryIcons';
import { QuickCategoryForm } from '@/src/components/categories/QuickCategoryForm';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useCurrency } from '@/src/contexts/CurrencyContext';

export default function CategoriesManagementPage() {
  const { categories, isLoading, error, refresh } = useExpenseTracking();
  const { formatAmount } = useCurrency();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense');

  const handleSuccess = () => {
    refresh();
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Cargando categorías...</div>;
  }

  if (error) {
    return <div className="text-red-600 dark:text-red-400">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-xl lg:text-2xl text-gray-800 dark:text-white" style={{ fontWeight: '300' }}>
            Gestión de Categorías
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Crea y organiza tus categorías y subcategorías
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          Nueva Categoría
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-300 dark:border-gray-600">
        <button
          onClick={() => setSelectedType('expense')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            selectedType === 'expense'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          Gastos
        </button>
        <button
          onClick={() => setSelectedType('income')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            selectedType === 'income'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          Ingresos
        </button>
      </div>

      {/* Lista de categorías */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories
          .filter(cat => cat.type === selectedType)
          .map((category) => (
            <div
              key={category.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              {/* Header de la categoría */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <CategoryIcon
                    iconName={category.icon || 'wallet'}
                    color={category.color || '#6366f1'}
                    size={32}
                  />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {category.name}
                    </h3>
                    {category.budget_limit && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Presupuesto: {formatAmount(category.budget_limit)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Subcategorías */}
              {category.subcategories.length > 0 ? (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    Subcategorías ({category.subcategories.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {category.subcategories.map((sub) => (
                      <span
                        key={sub.id}
                        className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 rounded"
                      >
                        {sub.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                  Sin subcategorías
                </p>
              )}
            </div>
          ))}
      </div>

      {categories.filter(cat => cat.type === selectedType).length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <div className="text-6xl mb-4">📁</div>
          <p className="text-lg mb-2">No hay categorías de {selectedType === 'expense' ? 'gastos' : 'ingresos'}</p>
          <p className="text-sm">Crea tu primera categoría para comenzar</p>
        </div>
      )}

      {/* Modal de creación */}
      {showCreateForm && (
        <QuickCategoryForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleSuccess}
          type={selectedType}
        />
      )}
    </div>
  );
}
