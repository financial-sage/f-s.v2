"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useSession } from '@/src/hooks/useSession';
import { getUserTransactionsWithCategories, type TransactionWithCategory } from '@/src/lib/supabase/transactions';

interface Props {
  height?: number;
  mock?: boolean; // usar datos mock para render inmediato
}

function getDaysInMonth(year: number, monthIndexZeroBased: number): string[] {
  const days: string[] = [];
  const lastDay = new Date(year, monthIndexZeroBased + 1, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    const day = String(d).padStart(2, '0');
    days.push(`${year}-${String(monthIndexZeroBased + 1).padStart(2, '0')}-${day}`);
  }
  return days;
}

export default function MonthlyTransactionsEChart({ height = 260, mock = true }: Props) {
  const { session } = useSession();
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartInstance = useRef<echarts.EChartsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seriesData, setSeriesData] = useState<{ name: string; color?: string; data: number[] }[]>([]);

  // Escuchar eventos de actualización
  useEffect(() => {
    const fetchAndUpdateData = async () => {
      // Render con datos mock si está habilitado
      if (mock) {
        // ... (el código mock existente)
        return;
      }
      if (!session?.user?.id) { setLoading(false); return; }
      try {
        setLoading(true);
        setError(null);
        const result = await getUserTransactionsWithCategories(session.user.id);
        // ... (resto del código de fetchData)
      } catch (e) {
        setError('Error al cargar transacciones del mes');
      } finally {
        setLoading(false);
      }
    };

    const handleDashboardUpdate = () => {
      fetchAndUpdateData();
    };

    window.addEventListener('dashboard:update' as any, handleDashboardUpdate);
    return () => window.removeEventListener('dashboard:update' as any, handleDashboardUpdate);
  }, [mock, session?.user?.id]);
  const [xAxisDays, setXAxisDays] = useState<string[]>([]);
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [monthOffset, setMonthOffset] = useState<number>(0); // 0: mes actual, 1: mes pasado, etc.
  const [containerReady, setContainerReady] = useState<boolean>(true);
  const [matchedCount, setMatchedCount] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      // Render con datos mock si está habilitado
      if (mock) {
        const now = new Date();
        const target = new Date(now.getFullYear(), now.getMonth(), 1);
        const days = getDaysInMonth(target.getFullYear(), target.getMonth());
        setXAxisDays(days.map(d => d.slice(8)));
        const s1 = days.map((_, i) => Math.max(0, Math.round(50 + 30 * Math.sin(i / 3))));
        const s2 = days.map((_, i) => Math.max(0, Math.round(30 + 20 * Math.cos(i / 4))));
        const s3 = days.map((_, i) => Math.max(0, Math.round(20 + 10 * Math.sin(i / 2) + 5 * Math.cos(i / 5))));
        setSeriesData([
          { name: 'Alimentación', color: '#ef4444', data: s1 },
          { name: 'Transporte', color: '#3b82f6', data: s2 },
          { name: 'Servicios', color: '#10b981', data: s3 }
        ]);
        setLoading(false);
        setError(null);
        return;
      }
      if (!session?.user?.id) { setLoading(false); return; }
      try {
        setLoading(true);
        setError(null);
        const result = await getUserTransactionsWithCategories(session.user.id);
        if (result.error) { setError(result.error.message); return; }

        const transactions = (result.data as TransactionWithCategory[]) || [];
        const now = new Date();
        // calcular mes objetivo según offset
        const target = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
        const targetYear = target.getFullYear();
        const targetMonth = target.getMonth();
        const days = getDaysInMonth(targetYear, targetMonth);
        setXAxisDays(days.map(d => d.slice(8))); // show only day number on axis

        // Agrupar por categoría sumas diarias del mes seleccionado y tipo seleccionado
        const byCategory: Record<string, { name: string; color?: string; daily: Record<string, number> }> = {};

        let matched = 0;
        for (const tx of transactions) {
          const date = new Date(tx.date);
          if (tx.type !== txType) continue;
          if (tx.status === 'canceled') continue; // permitir completed/pending
          if (date.getFullYear() !== targetYear || date.getMonth() !== targetMonth) continue;

          const key = tx.category?.id || 'uncategorized';
          if (!byCategory[key]) {
            byCategory[key] = {
              name: tx.category?.name || 'Sin categoría',
              color: tx.category?.color,
              daily: {}
            };
          }
          const dayStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          byCategory[key].daily[dayStr] = (byCategory[key].daily[dayStr] || 0) + Math.abs(tx.amount);
          matched += 1;
        }

        const series = Object.values(byCategory)
          .filter(cat => Object.values(cat.daily).some(v => v > 0))
          .map(cat => ({
            name: cat.name,
            color: cat.color,
            data: days.map(d => cat.daily[d] || 0)
          }));

        setSeriesData(series);
        setMatchedCount(matched);
      } catch (e) {
        setError('Error al cargar transacciones del mes');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session?.user?.id, txType, monthOffset, mock]);

  const option = useMemo((): echarts.EChartsOption => {
    const series = seriesData.map(s => ({
      name: s.name,
      type: 'line' as const,
      stack: 'total',
      smooth: true,
      showSymbol: txType === 'income' || matchedCount <= 2,
      symbolSize: 6,
      areaStyle: {
        opacity: 0.5,
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: s.color || '#60a5fa' },
          { offset: 1, color: (s.color ? `${s.color}00` : '#60a5fa00') as string },
        ])
      },
      lineStyle: { width: 2, color: s.color || undefined },
      emphasis: { focus: 'series' as const },
      data: s.data
    })) as unknown as echarts.SeriesOption[];

    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0, textStyle: { color: '#cbd5e1' } },
      grid: { left: 18, right: 12, bottom: 8, top: 28, containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: xAxisDays,
        axisLabel: { color: '#94a3b8' },
        axisLine: { lineStyle: { color: '#475569' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1f2937' } },
        min: 0
      },
      series
    };
  }, [seriesData, xAxisDays]);

  useEffect(() => {
    if (!chartRef.current) return;

    const container = chartRef.current;
    const initChart = () => {
      // Dispose and recreate to avoid stale state on key changes
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
      chartInstance.current = echarts.init(container, undefined, { renderer: 'canvas' });
      chartInstance.current.setOption(option);
      chartInstance.current.resize();
    };

    // Initialize immediately and on key changes (txType/monthOffset) via effect deps
    initChart();
    // Next tick resize
    requestAnimationFrame(() => { chartInstance.current && chartInstance.current.resize(); });

    const ro = new ResizeObserver(() => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    });
    ro.observe(container);

    const handleResize = () => { chartInstance.current && chartInstance.current.resize(); };
    window.addEventListener('resize', handleResize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, [txType, monthOffset]);

  useEffect(() => {
    if (!chartInstance.current && chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current, undefined, { renderer: 'canvas' });
    }
    if (chartInstance.current) {
      chartInstance.current.setOption(option, true);
      chartInstance.current.resize();
    }
  }, [option]);

  const showEmpty = !loading && !error && seriesData.length === 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setTxType('expense')}
            className={`px-3 py-1 rounded-full text-sm ${txType === 'expense' ? 'bg-red-500/20 text-red-300' : 'bg-white/5 text-zinc-300'}`}
          >
            Gastos
          </button>
          <button
            onClick={() => setTxType('income')}
            className={`px-3 py-1 rounded-full text-sm ${txType === 'income' ? 'bg-green-500/20 text-green-300' : 'bg-white/5 text-zinc-300'}`}
          >
            Ingresos
          </button>
        </div>
        <div className="flex items-center gap-2 p-2">
          <button
            onClick={() => setMonthOffset(prev => Math.min(prev + 1, 11))}
            className="px-2 py-1 rounded-full bg-white/5 text-zinc-300"
            aria-label="Mes anterior"
          >
            ◀
          </button>
          <span className="text-xs text-zinc-400">
            {new Date(new Date().getFullYear(), new Date().getMonth() - monthOffset, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => setMonthOffset(prev => Math.max(prev - 1, 0))}
            className="px-2 py-1 rounded-full bg-white/5 text-zinc-300"
            aria-label="Mes siguiente"
            disabled={monthOffset === 0}
          >
            ▶
          </button>
        </div>
      </div>
     {/* <div className="text-[10px] text-zinc-500 mb-1">{txType === 'income' ? 'Ingresos' : 'Gastos'} encontrados: {matchedCount}</div>*/}
      {loading && (
        <div className="text-[10px] text-zinc-400 mb-1">Cargando...</div>
      )}
      {error && (
        <div className="text-[10px] text-red-400 mb-1">{error}</div>
      )}
      {showEmpty && (
        <div className="p-2 text-xs text-zinc-400">Sin datos para este mes.</div>
      )}
      <div
        key={`${txType}-${monthOffset}`}
        ref={chartRef}
        style={{ width: '100%', minWidth: 120, height, minHeight: height, border: '1px solid transparent', borderRadius: 8 }}
      />
    </div>
  );
}


