import { getUserCategories, createCategory, Category } from '@/src/lib/supabase/categories';
import { supabase } from '@/src/lib/supabase/client';
import React, { useEffect, useState } from 'react';
import { CategoryIcon } from './CategoryIcons';
import { CategoryForm } from './CategoryForm';
import { Plus } from "lucide-react";

export function Categories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const loadCategories = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const result = await getUserCategories(session.user.id);
            if (result.data && Array.isArray(result.data)) {
                setCategories(result.data);
            }
        } catch (error) {
            console.error('Error al cargar categorías:', error);
        } finally {
            setIsLoadingCategories(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleNewCategory = (category: Category) => {
        setCategories(prev => [...prev, category]);
    };

    if (isLoadingCategories) {
        return (
            <div className="categories">
                <h2>Categorías</h2>
                <div className="text-zinc-400">Cargando categorías...</div>
            </div>
        );
    }

    return (
        <div className="categories">
            <h2>Categorías</h2>

            <div className="grid grid-cols-6 gap-3">


                {/* Categorías existentes */}
                {categories.map((category) => (
                    <div
                        key={category.id}
                        className="text-center  p-2 rounded-md border-zinc-700 cursor-pointer hover:border-zinc-600 transition"
                        title={category.name}
                    >
                        <div className="flex flex-col items-center gap-1">
                            <small className="text-zinc-400 text-muted">{category.name}</small>
                            <small className="text-zinc-400 text-muted">$0</small>
                            <div
                                className="rounded-full w-13 h-13 border border-zinc-700 flex items-center justify-center cursor-pointer hover:opacity-80 transition"
                                style={{ backgroundColor: category.color }}
                            >
                                <CategoryIcon
                                    iconName={category.icon || 'plus'}
                                    strokeWidth={1}
                                    size={30}
                                    color="white"
                                />
                            </div>
                            <small className="text-zinc-400 text-muted">$0</small>
                        </div>
                    </div>
                ))}

                {/* Botón para agregar nueva categoría */}
                <div
                    className="text-center border p-2 rounded-md border-zinc-700 cursor-pointer hover:border-zinc-600 transition"
                    title="Agregar categoría"
                    onClick={() => setShowForm(true)}
                >
                    <div className="flex flex-col items-center gap-1">
                        <small className="text-zinc-400 text-muted">Nueva</small>
                        <small className="text-zinc-400 text-muted">&nbsp;</small>
                        <div className="rounded-full bg-zinc-800 w-13 h-13 border border-zinc-700 flex items-center justify-center cursor-pointer hover:bg-zinc-500 transition">
                            <Plus strokeWidth={1} size={30} className="text-zinc-200" />
                        </div>
                        <small className="text-zinc-400 text-muted">&nbsp;</small>
                    </div>
                </div>
            </div>

            {/* Formulario modal para nueva categoría */}
            {showForm && (
                <CategoryForm
                    onCategoryCreated={handleNewCategory}
                    onClose={() => setShowForm(false)}
                />
            )}
        </div>
    );
}