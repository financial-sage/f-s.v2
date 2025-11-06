"use client";

import React, { useState } from 'react';
import { updateCategory } from '@/src/lib/supabase/categories';
import { createSubcategory, deleteSubcategory } from '@/src/lib/supabase/subcategories';
import { useSession } from '@/src/hooks/useSession';
import { CategoryIcon, AVAILABLE_ICONS } from './CategoryIcons';
import { X, Plus, Trash2 } from 'lucide-react';
import { CategoryWithSubcategories } from '@/src/lib/supabase/subcategories';

interface EditCategoryFormProps {
  category: CategoryWithSubcategories;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', 
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', 
  '#a855f7', '#ec4899', '#f43f5e', '#64748b'
];

export function EditCategoryForm({ category, onClose, onSuccess }: EditCategoryFormProps) {
  const { session } = useSession();
  const [categoryName, setCategoryName] = useState(category.name);
  const [selectedIcon, setSelectedIcon] = useState(category.icon || 'wallet');
  const [selectedColor, setSelectedColor] = useState(category.color || '#3b82f6');
  const [budgetLimit, setBudgetLimit] = useState(category.budget_limit?.toString() || '');
  const [existingSubcategories, setExistingSubcategories] = useState(category.subcategories);
  const [newSubcategories, setNewSubcategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleUpdateCategory = async () => {
    if (!categoryName.trim()) {
      setError('El nombre de la categoría es requerido');
      return;
    }

    if (!session?.user?.id) {
      setError('Debes iniciar sesión');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Actualizar categoría
      const result = await updateCategory(category.id, session.user.id, {
        name: categoryName.trim(),
        icon: selectedIcon,
        color: selectedColor,
        budget_limit: budgetLimit ? parseFloat(budgetLimit) : undefined,
        type: category.type as 'income' | 'expense'
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Crear nuevas subcategorías
      const validNewSubcategories = newSubcategories.filter(s => s.trim());
      if (validNewSubcategories.length > 0 && session.user) {
        const promises = validNewSubcategories.map(name =>
          createSubcategory(session.user!.id, category.id, name.trim())
        );
        const results = await Promise.all(promises);
        const hasError = results.some(r => r.error);
        if (hasError) {
          throw new Error('Error al crear algunas subcategorías');
        }
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la categoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    if (!session?.user?.id) return;
    
    setIsSubmitting(true);
    try {
      const result = await deleteSubcategory(subcategoryId, session.user.id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      setExistingSubcategories(existingSubcategories.filter(s => s.id !== subcategoryId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar subcategoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addNewSubcategoryField = () => {
    setNewSubcategories([...newSubcategories, '']);
  };

  const updateNewSubcategory = (index: number, value: string) => {
    const updated = [...newSubcategories];
    updated[index] = value;
    setNewSubcategories(updated);
  };

  const removeNewSubcategory = (index: number) => {
    setNewSubcategories(newSubcategories.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Editar Categoría
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nombre de la categoría *
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Alimentación"
              />
            </div>

            {/* Icono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Icono
              </label>
              <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 dark:border-gray-600 rounded-lg">
                {AVAILABLE_ICONS.slice(0, 32).map((icon) => {
                  const isSelected = selectedIcon === icon.name;
                  
                  return (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => setSelectedIcon(icon.name)}
                      className={`relative overflow-hidden flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer border-2 transition-all ${
                        isSelected ? 'ring-2 ring-offset-2' : 'hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                      style={{
                        borderColor: isSelected ? selectedColor : 'transparent',
                        boxShadow: isSelected ? `0 0 0 6px ${selectedColor}22` : undefined
                      }}
                      title={icon.label}
                    >
                      <div 
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: `${selectedColor}0F`,
                          pointerEvents: 'none'
                        }}
                      />
                      <div className="relative z-10">
                        <CategoryIcon iconName={icon.name} color={selectedColor} size={24} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      selectedColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Presupuesto (solo para gastos) */}
            {category.type === 'expense' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Presupuesto mensual (opcional)
                </label>
                <input
                  type="number"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            )}

            {/* Subcategorías existentes */}
            {existingSubcategories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subcategorías actuales
                </label>
                <div className="space-y-2">
                  {existingSubcategories.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="text-sm text-gray-900 dark:text-white">{sub.name}</span>
                      <button
                        onClick={() => handleDeleteSubcategory(sub.id)}
                        disabled={isSubmitting}
                        className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                        title="Eliminar subcategoría"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nuevas subcategorías */}
            {newSubcategories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nuevas subcategorías
                </label>
                <div className="space-y-2">
                  {newSubcategories.map((sub, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={sub}
                        onChange={(e) => updateNewSubcategory(index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Nueva subcategoría ${index + 1}`}
                      />
                      <button
                        onClick={() => removeNewSubcategory(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={addNewSubcategoryField}
              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Agregar subcategoría
            </button>

            {/* Botones */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateCategory}
                disabled={isSubmitting || !categoryName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
