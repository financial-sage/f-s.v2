"use client";

import React, { useState } from 'react';
import { createCategory } from '@/src/lib/supabase/categories';
import { createSubcategory } from '@/src/lib/supabase/subcategories';
import { useSession } from '@/src/hooks/useSession';
import { CategoryIcon, AVAILABLE_ICONS } from './CategoryIcons';
import { X } from 'lucide-react';

interface QuickCategoryFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  type?: 'income' | 'expense';
}

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', 
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', 
  '#a855f7', '#ec4899', '#f43f5e', '#64748b'
];

export function QuickCategoryForm({ onClose, onSuccess, type = 'expense' }: QuickCategoryFormProps) {
  const { session } = useSession();
  const [step, setStep] = useState<'category' | 'subcategory'>('category');
  const [categoryName, setCategoryName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('wallet');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [createdCategoryId, setCreatedCategoryId] = useState<string | null>(null);
  const [subcategories, setSubcategories] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCreateCategory = async () => {
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
      const result = await createCategory(session.user.id, {
        name: categoryName.trim(),
        icon: selectedIcon,
        color: selectedColor,
        budget_limit: budgetLimit ? parseFloat(budgetLimit) : undefined,
        type
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (result.data && 'id' in result.data) {
        setCreatedCategoryId(result.data.id);
        setStep('subcategory');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la categoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubcategories = async () => {
    if (!createdCategoryId || !session?.user?.id) return;

    const validSubcategories = subcategories.filter(s => s.trim());
    
    if (validSubcategories.length === 0) {
      // Si no hay subcategorías, solo cerrar
      onSuccess?.();
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const userId = session.user.id;
      // Crear todas las subcategorías
      const promises = validSubcategories.map(name =>
        createSubcategory(userId, createdCategoryId, name.trim())
      );

      const results = await Promise.all(promises);
      
      const hasError = results.some(r => r.error);
      if (hasError) {
        throw new Error('Error al crear algunas subcategorías');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear subcategorías');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSubcategoryField = () => {
    setSubcategories([...subcategories, '']);
  };

  const updateSubcategory = (index: number, value: string) => {
    const updated = [...subcategories];
    updated[index] = value;
    setSubcategories(updated);
  };

  const removeSubcategory = (index: number) => {
    if (subcategories.length > 1) {
      setSubcategories(subcategories.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {step === 'category' ? 'Nueva Categoría' : 'Agregar Subcategorías'}
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

          {step === 'category' ? (
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
                  autoFocus
                />
              </div>

              {/* Icono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Icono
                </label>
                <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 dark:border-gray-600 rounded-lg">
                  {AVAILABLE_ICONS.slice(0, 32).map((icon) => (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => setSelectedIcon(icon.name)}
                      className={`p-2 rounded transition-all ${
                        selectedIcon === icon.name
                          ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                      title={icon.label}
                    >
                      <CategoryIcon iconName={icon.name} color={selectedColor} size={24} />
                    </button>
                  ))}
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
              {type === 'expense' && (
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
                  onClick={handleCreateCategory}
                  disabled={isSubmitting || !categoryName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Creando...' : 'Crear Categoría'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Categoría <strong>{categoryName}</strong> creada. Ahora puedes agregar subcategorías (opcional).
              </p>

              {/* Subcategorías */}
              <div className="space-y-2">
                {subcategories.map((sub, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={sub}
                      onChange={(e) => updateSubcategory(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Subcategoría ${index + 1}`}
                    />
                    {subcategories.length > 1 && (
                      <button
                        onClick={() => removeSubcategory(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addSubcategoryField}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                + Agregar otra subcategoría
              </button>

              {/* Botones */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    onSuccess?.();
                    onClose();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  disabled={isSubmitting}
                >
                  Omitir
                </button>
                <button
                  onClick={handleCreateSubcategories}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Subcategorías'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
