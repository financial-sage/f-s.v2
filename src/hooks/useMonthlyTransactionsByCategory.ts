"use client";

import { useState, useEffect } from 'react';
import { useSession } from './useSession';
import { getUserTransactionsWithCategories, type TransactionWithCategory } from '@/src/lib/supabase/transactions';
import { useCurrency } from '@/src/contexts/CurrencyContext';

interface MonthlyData {
  month: string;
  monthName: string;
  year: number;
  categories: {
    [categoryId: string]: {
      categoryName: string;
      categoryColor?: string;
      amount: number;
      count: number;
    };
  };
}

interface CategoryMonthlyData {
  categoryId: string;
  categoryName: string;
  categoryColor?: string;
  data: Array<{
    primary: string; // Fecha en formato YYYY-MM
    secondary: number; // Monto
    monthName: string; // Nombre del mes para display
  }>;
}

export function useMonthlyTransactionsTrend(monthsBack: number = 6) {
  const [data, setData] = useState<CategoryMonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { session } = useSession();
  const { currency } = useCurrency();

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await getUserTransactionsWithCategories(session.user.id);
        
        if (result.error) {
          setError(result.error.message);
          return;
        }

        const transactions = result.data as TransactionWithCategory[] || [];

        // Generar los últimos N meses
        const months: MonthlyData[] = [];
        const today = new Date();
        
        for (let i = monthsBack - 1; i >= 0; i--) {
          const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const monthName = date.toLocaleDateString('es-ES', { month: 'short' });
          
          months.push({
            month: `${year}-${month}`,
            monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            year,
            categories: {}
          });
        }

        // Filtrar transacciones de gastos de los últimos meses
        const relevantTransactions = transactions.filter(transaction => {
          const transactionDate = new Date(transaction.date);
          const transactionMonth = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
          
          return (
            transaction.type === 'expense' &&
            transaction.status === 'completed' &&
            months.some(m => m.month === transactionMonth)
          );
        });

        // Agrupar transacciones por mes y categoría
        relevantTransactions.forEach(transaction => {
          const transactionDate = new Date(transaction.date);
          const transactionMonth = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
          
          const monthData = months.find(m => m.month === transactionMonth);
          if (!monthData) return;

          const categoryId = transaction.category?.id || 'uncategorized';
          const categoryName = transaction.category?.name || 'Sin categoría';
          const categoryColor = transaction.category?.color;

          if (!monthData.categories[categoryId]) {
            monthData.categories[categoryId] = {
              categoryName,
              categoryColor,
              amount: 0,
              count: 0
            };
          }

          monthData.categories[categoryId].amount += transaction.amount;
          monthData.categories[categoryId].count += 1;
        });

        // Obtener todas las categorías únicas
        const allCategories = new Set<string>();
        months.forEach(month => {
          Object.keys(month.categories).forEach(categoryId => {
            allCategories.add(categoryId);
          });
        });

        // Convertir a formato para react-charts
        const chartData: CategoryMonthlyData[] = Array.from(allCategories).map(categoryId => {
          const category = months.find(m => m.categories[categoryId])?.categories[categoryId];
          
          return {
            categoryId,
            categoryName: category?.categoryName || 'Sin categoría',
            categoryColor: category?.categoryColor,
            data: months.map(month => ({
              primary: month.month,
              secondary: month.categories[categoryId]?.amount || 0,
              monthName: month.monthName
            }))
          };
        }).filter(category => {
          // Solo incluir categorías que tienen al menos un gasto
          return category.data.some(point => point.secondary > 0);
        });

        setData(chartData);
      } catch (err) {
        setError('Error al cargar datos de transacciones mensuales');
        console.error('Error fetching monthly transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session?.user?.id, currency.code, monthsBack]);

  return { data, loading, error };
}