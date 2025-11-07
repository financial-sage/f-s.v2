"use client";

import React, { useState, useEffect } from 'react';
import { CategoryIcon } from '@/src/components/categories/CategoryIcons';
import { QuickCategoryForm } from '@/src/components/categories/QuickCategoryForm';
import { EditCategoryForm } from '@/src/components/categories/EditCategoryForm';
import { deleteCategory, getUserCategories, Category } from '@/src/lib/supabase/categories';
import { deleteSubcategory, getCategorySubcategories } from '@/src/lib/supabase/subcategories';
import { useSession } from '@/src/hooks/useSession';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useCurrency } from '@/src/contexts/CurrencyContext';
import { CategoryWithSubcategories, SubcategoryWithExpenses } from '@/src/lib/supabase/subcategories';
import { Loader } from '@/src/components/common';

export default function CategoriesManagementPage() {
  const { formatAmount } = useCurrency();
  const { session } = useSession();
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithSubcategories | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [deletingSubcategoryId, setDeletingSubcategoryId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'income' | 'expense'>('expense');

  // Cargar categorías con sus subcategorías
  const loadCategories = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Obtener todas las categorías
      const categoriesResult = await getUserCategories(session.user.id);
      
      if (categoriesResult.error) {
        throw new Error(categoriesResult.error.message);
      }

      const categoriesData = Array.isArray(categoriesResult.data) 
        ? categoriesResult.data 
        : categoriesResult.data 
        ? [categoriesResult.data] 
        : [];

      // Para cada categoría, obtener sus subcategorías
      const categoriesWithSubs: CategoryWithSubcategories[] = await Promise.all(
        categoriesData.map(async (cat: Category) => {
          const subsResult = await getCategorySubcategories(cat.id, session.user!.id);
          const subs = subsResult.data || [];
          
          return {
            id: cat.id,
            name: cat.name,
            color: cat.color,
            icon: cat.icon || null,
            budget_limit: cat.budget_limit || null,
            type: cat.type,
            total_expenses: 0,
            subcategories: subs.map(sub => ({
              ...sub,
              total_expenses: 0
            }))
          };
        })
      );

      setCategories(categoriesWithSubs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar categorías');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [session?.user?.id]);

  const handleSuccess = () => {
    loadCategories();
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!session?.user?.id) return;
    
    if (!confirm('¿Estás seguro de eliminar esta categoría? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeletingCategoryId(categoryId);
    try {
      const result = await deleteCategory(categoryId, session.user.id);
      if (result.error) {
        alert(result.error.message);
      } else {
        await loadCategories();
      }
    } catch (err) {
      alert('Error al eliminar la categoría');
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string, categoryId: string) => {
    if (!session?.user?.id) return;
    
    if (!confirm('¿Estás seguro de eliminar esta subcategoría?')) {
      return;
    }

    setDeletingSubcategoryId(subcategoryId);
    try {
      const result = await deleteSubcategory(subcategoryId, session.user.id);
      if (result.error) {
        alert(result.error.message);
      } else {
        await loadCategories();
      }
    } catch (err) {
      alert('Error al eliminar la subcategoría');
    } finally {
      setDeletingSubcategoryId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-3">
        <Loader />
        <div className="text-sm text-gray-600 dark:text-gray-400">Cargando categorías...</div>
      </div>
    );
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
                    onClick={() => setEditingCategory(category)}
                    className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id)}
                    disabled={deletingCategoryId === category.id}
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
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
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 rounded group"
                      >
                        {sub.name}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSubcategory(sub.id, category.id);
                          }}
                          disabled={deletingSubcategoryId === sub.id}
                          className="opacity-0 group-hover:opacity-100 ml-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-opacity disabled:opacity-50"
                          title="Eliminar subcategoría"
                        >
                          <Trash2 size={12} />
                        </button>
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

      {/* Modal de edición */}
      {editingCategory && (
        <EditCategoryForm
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
