import { getUserCategories, createCategory, Category } from '@/src/lib/supabase/categories';
import { getCategoryExpenses } from '@/src/lib/supabase/transactions';
import { supabase } from '@/src/lib/supabase/client';
import React, { useEffect, useState } from 'react';
import { CategoryIcon } from './CategoryIcons';
import { CategoryForm } from './CategoryForm';
import { CategoryProgressCircle } from './CategoryProgressCircle';
import { Plus } from "lucide-react";

export function Categories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryExpenses, setCategoryExpenses] = useState<Record<string, number>>({});
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const loadCategories = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Cargar categorías y gastos en paralelo
            const [categoriesResult, expensesResult] = await Promise.all([
                getUserCategories(session.user.id),
                getCategoryExpenses(session.user.id)
            ]);

            if (categoriesResult.data && Array.isArray(categoriesResult.data)) {
                setCategories(categoriesResult.data);
            }

            if (expensesResult.data) {
                setCategoryExpenses(expensesResult.data);
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
        // Recargar gastos cuando se agrega una nueva categoría
        loadCategories();
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
                {categories.map((category) => {
                    const currentExpense = categoryExpenses[category.id] || 0;
                    const formattedExpense = currentExpense.toLocaleString('es-ES', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    });
                    const formattedBudget = category.budget_limit ? 
                        category.budget_limit.toLocaleString('es-ES', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        }) : null;

                    return (
                        <div
                            key={category.id}
                            className="text-center p-2 rounded-md border-zinc-700 cursor-pointer hover:border-zinc-600 transition"
                            title={`${category.name}${formattedBudget ? ` - Presupuesto: ${formattedBudget}` : ''}`}
                        >
                            <div className="flex flex-col items-center gap-1">
                                <small className="text-zinc-400 text-muted">{category.name}</small>
                                <small className="text-zinc-400 text-muted">{formattedExpense}</small>
                                
                                <CategoryProgressCircle
                                    categoryId={category.id}
                                    categoryIcon={category.icon || 'plus'}
                                    categoryColor={category.color}
                                    budgetLimit={category.budget_limit}
                                    currentExpense={currentExpense}
                                />
                                
                                <small className="text-zinc-400 text-muted">
                                    {formattedBudget || 'Sin límite'}
                                </small>
                            </div>
                        </div>
                    );
                })}

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