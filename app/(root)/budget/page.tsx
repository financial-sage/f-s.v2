"use client";

import { useState, useEffect } from 'react';
import { Category, getUserCategories } from '@/src/lib/supabase/categories';
import { getCategoryExpenses } from '@/src/lib/supabase/transactions';
import { supabase } from '@/src/lib/supabase/client';
import { CategoryIcon } from '@/src/components/categories/CategoryIcons';
import { useCurrency } from '@/src/contexts/CurrencyContext';

export default function BudgetPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryExpenses, setCategoryExpenses] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const { formatAmount, currency } = useCurrency();

    useEffect(() => {
        const loadCategoriesAndExpenses = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                // Cargar categorías y gastos en paralelo
                const [categoriesResult, expensesResult] = await Promise.all([
                    getUserCategories(session.user.id),
                    getCategoryExpenses(session.user.id)
                ]);

                if (categoriesResult.data && Array.isArray(categoriesResult.data)) {
                    setCategories(categoriesResult.data.filter(cat => cat.type === 'expense'));
                }

                if (!expensesResult.error && expensesResult.data) {
                    setCategoryExpenses(expensesResult.data);
                }
            } catch (error) {
                console.error('Error al cargar datos:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadCategoriesAndExpenses();
    }, []);

    return (
        <div>
            <h1 className="text-2xl font-bold dark:text-white" style={{ fontWeight: "200" }}>Presupuesto!</h1>
            <p className="dark:text-zinc-400">Aquí puedes gestionar y visualizar tu presupuesto.</p>
            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-3 mt-4">
                <div className="card sm h-full">
                    <div className="cardHeader">
                        <h3 className="cardTitle">Presupuesto Mensual</h3>
                        <p className="cardSubtitle">Resumen de tu presupuesto mensual.</p>
                    </div>
                    <div className="cardContent">
                        {isLoading ? (
                            <p className="text-zinc-400">Cargando presupuestos...</p>
                        ) : categories.length === 0 ? (
                            <p className="text-zinc-400">No hay categorías de gastos configuradas.</p>
                        ) : (
                            <ul>
                                {categories.map(category => {
                                    const currentExpense = categoryExpenses[category.id] || 0;
                                    const budgetLimit = category.budget_limit || 0;
                                    const progressPercentage = budgetLimit > 0 ? Math.min(100, (currentExpense / budgetLimit) * 100) : 0;

                                    return (
                                        <li key={category.id} className="mb-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div className="mr-2 m-2 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: category.color }}>
                                                        <CategoryIcon 
                                                            iconName={category.icon || 'plus'} 
                                                            size={20}
                                                            color="white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold">{category.name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col w-1/2 mr-4">
                                                    {budgetLimit > 0 && (
                                                        <div className="w-full bg-gray-200 rounded-full h-1 dark:bg-gray-700">
                                                            <div 
                                                                className={`h-1 rounded-full ${
                                                                    progressPercentage >= 100 ? 'bg-red-600' : 
                                                                    progressPercentage >= 80 ? 'bg-yellow-600' : 
                                                                    'bg-blue-600'
                                                                }`} 
                                                                style={{ width: `${progressPercentage}%` }}
                                                            ></div>
                                                        </div>
                                                    )}
                                                    <p className="text-sm text-zinc-500 dark:text-zinc-400 text-right mt-1">
                                                        Gastado: {formatAmount(currentExpense)} 
                                                        {budgetLimit > 0 ? ` de ${formatAmount(budgetLimit)}` : ' (sin límite)'}
                                                    </p>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
