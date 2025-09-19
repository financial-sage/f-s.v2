"use client";

import React, { useMemo } from 'react';
import { Chart } from 'react-charts';
import { useMonthlyTransactionsTrend } from '@/src/hooks/useMonthlyTransactionsByCategory';
import { useCurrency } from '@/src/contexts/CurrencyContext';

interface MonthlyTransactionChartProps {
  monthsBack?: number;
  height?: number;
}

// Paleta de colores para las líneas
const CHART_COLORS = [
  '#8B5CF6', // Púrpura
  '#10B981', // Verde
  '#F59E0B', // Ámbar
  '#EF4444', // Rojo
  '#3B82F6', // Azul
  '#EC4899', // Rosa
  '#14B8A6', // Teal
  '#F97316', // Naranja
  '#6366F1', // Índigo
  '#84CC16', // Lima
];

export function MonthlyTransactionChart({ monthsBack = 6, height = 400 }: MonthlyTransactionChartProps) {
  const { data, loading, error } = useMonthlyTransactionsTrend(monthsBack);
  const { formatAmount } = useCurrency();

  const chartData = useMemo(() => {
    return data.map((category, index) => ({
      label: category.categoryName,
      data: category.data,
      color: category.categoryColor || CHART_COLORS[index % CHART_COLORS.length]
    }));
  }, [data]);

  const primaryAxis = useMemo(
    () => ({
      getValue: (datum: { primary: string; secondary: number; monthName: string }) => datum.primary,
    }),
    []
  );

  const secondaryAxes = useMemo(
    () => [
      {
        getValue: (datum: { primary: string; secondary: number; monthName: string }) => datum.secondary,
        elementType: 'line' as const,
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="animate-pulse text-gray-500 dark:text-gray-400">
          Cargando gráfica mensual...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-red-500 dark:text-red-400 text-center">
          <p className="font-medium">Error al cargar datos</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-gray-500 dark:text-gray-400 text-center">
          <p className="text-lg font-medium">No hay datos suficientes</p>
          <p className="text-sm">Agrega algunas transacciones para ver la tendencia</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header con información */}
      <div className="mb-4">
 
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Evolución mensual de gastos en los últimos {monthsBack} meses
        </p>
      </div>

      {/* Gráfica */}
      <div 
        className="w-full bg-white dark:bg-gray-800 rounded-lg p-4"
        style={{ height: `200px` }}
      >
        <Chart
          options={{
            data: chartData,
            primaryAxis,
            secondaryAxes,
            interactionMode: 'closest',
            tooltip: {
              show: true,
            },
            defaultColors: CHART_COLORS,
            dark: true,
         
          }}
        />
      </div>

      {/* Leyenda personalizada */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        {chartData.slice(0, 6).map((series) => (
          <div key={series.label} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: series.color }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {series.label}
            </span>
          </div>
        ))}
        {chartData.length > 6 && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            +{chartData.length - 6} más
          </div>
        )}
      </div>

      {/* Resumen de estadísticas */}
      {/* <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Categorías Activas</p>
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            {data.length}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Período</p>
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            {monthsBack} meses
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 col-span-2 md:col-span-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Máximo</p>
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            {formatAmount(
              Math.max(...data.flatMap(category => 
                category.data.map(point => point.secondary)
              ))
            )}
          </p>
        </div>
      </div> */}
    </div>
  );
}