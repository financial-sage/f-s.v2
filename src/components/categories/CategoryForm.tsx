import React, { useState } from 'react';
import { CategoryIcon, AVAILABLE_ICONS, type IconOption } from './CategoryIcons';
import { createCategory, type NewCategory } from '@/src/lib/supabase/categories';
import { supabase } from '@/src/lib/supabase/client';

interface CategoryFormProps {
    onCategoryCreated: (category: any) => void;
    onClose: () => void;
}

const PREDEFINED_COLORS = [
    '#ef4444', // red-500
    '#f97316', // orange-500
    '#eab308', // yellow-500
    '#22c55e', // green-500
    '#06b6d4', // cyan-500
    '#3b82f6', // blue-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#64748b', // slate-500
    '#78716c', // stone-500
];

export function CategoryForm({ onCategoryCreated, onClose }: CategoryFormProps) {
    const [formData, setFormData] = useState<NewCategory>({
        name: '',
        color: PREDEFINED_COLORS[0],
        icon: 'plus',
        budget_limit: undefined,
        type: 'expense',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('No hay sesión activa');
                return;
            }

            const result = await createCategory(session.user.id, formData);
            
            if (result.error) {
                setError(result.error.message);
                return;
            }

            if (result.data) {
                onCategoryCreated(result.data);
                onClose();
            }
        } catch (err) {
            console.error('Error al crear categoría:', err);
            setError('Error al crear la categoría');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md mx-4">
                <h3 className="text-xl font-semibold text-white mb-4">Nueva Categoría</h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                            Nombre
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ej: Entretenimiento"
                            required
                        />
                    </div>

                    {/* Icono */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Icono
                        </label>
                        <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto border border-zinc-700 rounded-md p-2 bg-zinc-800">
                            {AVAILABLE_ICONS.map((iconOption: IconOption) => (
                                <button
                                    key={iconOption.name}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, icon: iconOption.name }))}
                                    className={`p-2 rounded-md border transition-colors ${
                                        formData.icon === iconOption.name
                                            ? 'border-blue-500 bg-blue-500/20'
                                            : 'border-zinc-600 hover:border-zinc-500'
                                    }`}
                                    title={iconOption.label}
                                >
                                    <CategoryIcon 
                                        iconName={iconOption.name} 
                                        size={20} 
                                        color={formData.icon === iconOption.name ? '#3b82f6' : '#e4e4e7'}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Color
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {PREDEFINED_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                                        formData.color === color
                                            ? 'border-white scale-110'
                                            : 'border-zinc-600 hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Límite de presupuesto (opcional) */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                            Límite de Presupuesto (opcional)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.budget_limit || ''}
                            onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                budget_limit: e.target.value ? parseFloat(e.target.value) : undefined 
                            }))}
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                        />
                    </div>

                    {/* Vista previa */}
                    <div className="bg-zinc-800 p-3 rounded-md border border-zinc-700">
                        <p className="text-sm text-zinc-400 mb-2">Vista previa:</p>
                        <div className="flex items-center gap-3">
                            <div 
                                className="rounded-full w-10 h-10 border border-zinc-700 flex items-center justify-center"
                                style={{ backgroundColor: formData.color }}
                            >
                                <CategoryIcon 
                                    iconName={formData.icon || 'plus'} 
                                    color="white" 
                                    size={20} 
                                />
                            </div>
                            <span className="text-white">{formData.name || 'Nombre de categoría'}</span>
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm">{error}</div>
                    )}

                    {/* Botones */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-zinc-700 text-zinc-300 rounded-md hover:bg-zinc-800 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !formData.name.trim()}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Creando...' : 'Crear'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}