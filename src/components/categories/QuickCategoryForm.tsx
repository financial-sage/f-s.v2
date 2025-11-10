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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-60 lg:z-50 p-0">
      <div 
        className="rounded-none lg:rounded-lg shadow-xl w-full h-full lg:h-auto max-w-full lg:max-w-2xl overflow-hidden flex flex-col"
        style={{ background: "var(--background-gradient)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700 flex-shrink-0">
          <h2 className="text-lg font-medium text-zinc-200">
            {step === 'category' ? 'Nueva Categoría' : 'Agregar Subcategorías'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 'category' ? (
            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                  Nombre de la categoría *
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-3 sm:py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-base sm:text-sm"
                  placeholder="Ej: Alimentación"
                  autoFocus
                />
              </div>

              {/* Icono */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                  Icono
                </label>
                <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border border-zinc-700 rounded-lg bg-zinc-900/30">
                  {AVAILABLE_ICONS.slice(0, 32).map((icon) => {
                    const isSelected = selectedIcon === icon.name;
                    
                    return (
                      <button
                        key={icon.name}
                        type="button"
                        onClick={() => setSelectedIcon(icon.name)}
                        className={`relative overflow-hidden flex flex-col items-center justify-center p-3 rounded-lg cursor-pointer border-2 transition-all ${
                          isSelected ? 'ring-2 ring-offset-2 ring-offset-zinc-900' : 'hover:bg-white/10'
                        }`}
                        style={{
                          borderColor: isSelected ? selectedColor : 'transparent',
                          boxShadow: isSelected ? `0 0 0 6px ${selectedColor}22` : undefined
                        }}
                        title={icon.label}
                      >
                        {/* Background soft layer */}
                        <div 
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: `${selectedColor}0F`,
                            pointerEvents: 'none'
                          }}
                        />
                        
                        {/* Icon */}
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
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-blue-500' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Presupuesto (solo para gastos) */}
              {type === 'expense' && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">
                    Presupuesto mensual (opcional)
                  </label>
                  <input
                    type="number"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(e.target.value)}
                    className="w-full px-3 py-3 sm:py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-base sm:text-sm text-right"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                Categoría <strong className="text-zinc-200">{categoryName}</strong> creada. Ahora puedes agregar subcategorías (opcional).
              </p>

              {/* Subcategorías */}
              <div className="space-y-2">
                {subcategories.map((sub, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={sub}
                      onChange={(e) => updateSubcategory(index, e.target.value)}
                      className="flex-1 px-3 py-3 sm:py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-base sm:text-sm"
                      placeholder={`Subcategoría ${index + 1}`}
                    />
                    {subcategories.length > 1 && (
                      <button
                        onClick={() => removeSubcategory(index)}
                        className="px-3 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addSubcategoryField}
                className="w-full px-4 py-3 sm:py-2 border-2 border-dashed border-zinc-700 text-zinc-400 rounded-lg hover:bg-zinc-800/50 hover:border-zinc-600 transition-all text-base sm:text-sm"
              >
                + Agregar otra subcategoría
              </button>
            </div>
          )}
        </div>

        {/* Botones - Fixed footer */}
        <div className="border-t border-zinc-700 p-4 sm:p-6 bg-zinc-900/30 flex-shrink-0">
          {step === 'category' ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onClose}
                className="py-3.5 sm:py-3 rounded-lg font-medium transition-all text-base sm:text-sm border border-zinc-600 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={isSubmitting || !categoryName.trim()}
                className="py-3.5 sm:py-3 rounded-lg text-zinc-100 font-medium transition-all text-base sm:text-sm bg-blue-500/30 hover:bg-blue-500/40 active:bg-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creando...' : 'Crear Categoría'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  onSuccess?.();
                  onClose();
                }}
                className="py-3.5 sm:py-3 rounded-lg font-medium transition-all text-base sm:text-sm border border-zinc-600 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200"
                disabled={isSubmitting}
              >
                Omitir
              </button>
              <button
                onClick={handleCreateSubcategories}
                disabled={isSubmitting}
                className="py-3.5 sm:py-3 rounded-lg text-zinc-100 font-medium transition-all text-base sm:text-sm bg-blue-500/30 hover:bg-blue-500/40 active:bg-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Subcategorías'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
