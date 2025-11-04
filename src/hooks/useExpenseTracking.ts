import { useState, useEffect, useCallback } from 'react';
import { getCategoriesWithSubcategories, CategoryWithSubcategories } from '@/src/lib/supabase/subcategories';
import { supabase } from '@/src/lib/supabase/client';

interface UseExpenseTrackingReturn {
  categories: CategoryWithSubcategories[];
  isLoading: boolean;
  error: string | null;
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  refresh: () => Promise<void>;
  totalBudget: number;
  totalExpenses: number;
  budgetProgress: number;
}

export function useExpenseTracking(): UseExpenseTrackingReturn {
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const loadExpenseData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No hay sesión activa');
        return;
      }

      // Calcular inicio y fin del mes seleccionado
      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);

      const result = await getCategoriesWithSubcategories(
        session.user.id,
        startDate,
        endDate
      );

      if (result.error) {
        setError(result.error.message);
      } else if (result.data) {
        setCategories(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadExpenseData();
  }, [loadExpenseData]);

  // Calcular totales
  const totalBudget = categories.reduce((sum, cat) => sum + (cat.budget_limit || 0), 0);
  const totalExpenses = categories.reduce((sum, cat) => sum + cat.total_expenses, 0);
  const budgetProgress = totalBudget > 0 ? (totalExpenses / totalBudget) * 100 : 0;

  return {
    categories,
    isLoading,
    error,
    selectedMonth,
    setSelectedMonth,
    refresh: loadExpenseData,
    totalBudget,
    totalExpenses,
    budgetProgress
  };
}
