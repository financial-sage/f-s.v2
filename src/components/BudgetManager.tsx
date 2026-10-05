"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, PencilLine, PiggyBank } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useBudget } from "@/hooks/useBudget";
import { computeSpendingByCategory, type BudgetExpenseRow } from "@/lib/budgetSpending";
import {
  formatCurrency,
  formatMonthLabel,
  getMonthKey,
  shiftMonthKey,
} from "@/lib/budget";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { useExpenseStore } from "@/store/useExpenseStore";

interface BudgetManagerProps {
  familyId: string;
  initialExpenses: BudgetExpenseRow[];
}

function getProgressState(spent: number, limit: number) {
  if (limit <= 0) return "none" as const;
  const ratio = spent / limit;
  if (ratio >= 1) return "over" as const;
  if (ratio >= 0.85) return "warning" as const;
  return "ok" as const;
}

export default function BudgetManager({ familyId, initialExpenses }: BudgetManagerProps) {
  const storeExpenses = useExpenseStore((s) => s.expenses);
  const isHydrated = useExpenseStore((s) => s.isHydrated);

  const expenses = useMemo(() => {
    if (!isHydrated || storeExpenses.length === 0) return initialExpenses;
    return storeExpenses as BudgetExpenseRow[];
  }, [initialExpenses, isHydrated, storeExpenses]);

  const { activeCategories, getDisplayForCategory } = useCategories(familyId);
  const { getLimits, setCategoryLimit, duplicateFromPreviousMonth, hasAnyLimit } = useBudget(familyId);

  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [draftLimit, setDraftLimit] = useState("0");
  const [toast, setToast] = useState<string | null>(null);

  const limits = getLimits(monthKey);
  const spendingByCategory = useMemo(
    () => computeSpendingByCategory(expenses, monthKey),
    [expenses, monthKey],
  );

  const rows = useMemo(() => {
    return activeCategories
      .map((category) => {
        const display = getDisplayForCategory(category.id);
        const spent = spendingByCategory.get(category.id) ?? 0;
        const limit = limits[category.id] ?? 0;
        return {
          id: category.id,
          display,
          spent,
          limit,
          state: getProgressState(spent, limit),
        };
      })
      .sort((a, b) => {
        if (b.spent !== a.spent) return b.spent - a.spent;
        return a.display.label.localeCompare(b.display.label, "es");
      });
  }, [activeCategories, getDisplayForCategory, limits, spendingByCategory]);

  const totalLimit = useMemo(
    () => Object.values(limits).reduce((sum, value) => sum + value, 0),
    [limits],
  );
  const totalSpent = useMemo(
    () => rows.reduce((sum, row) => sum + row.spent, 0),
    [rows],
  );
  const totalRemaining = totalLimit - totalSpent;
  const configuredCount = Object.keys(limits).length;
  const isCurrentMonth = monthKey === getMonthKey();

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  function openLimitEditor(categoryId: string) {
    const current = limits[categoryId] ?? 0;
    setDraftLimit(current > 0 ? String(current) : "0");
    setEditingCategoryId(categoryId);
  }

  function closeLimitEditor() {
    setEditingCategoryId(null);
    setDraftLimit("0");
  }

  function confirmLimit(value?: string) {
    if (!editingCategoryId) return;
    const normalized = Number(String(value ?? draftLimit).replace(/,/g, "."));
    if (!Number.isFinite(normalized) || normalized < 0) {
      showToast("Ingresa un monto válido.");
      return;
    }
    setCategoryLimit(monthKey, editingCategoryId, normalized);
    closeLimitEditor();
  }

  function handleDuplicatePrevious() {
    const copied = duplicateFromPreviousMonth(monthKey);
    showToast(copied ? "Presupuesto copiado del mes anterior." : "No hay presupuesto en el mes anterior.");
  }

  const editingCategory = editingCategoryId
    ? getDisplayForCategory(editingCategoryId)
    : null;

  return (
    <div className="min-h-dvh bg-surface">
      <PageHeader
        title="Presupuesto"
        subtitle={formatMonthLabel(monthKey)}
        backHref="/"
        right={
          <button
            type="button"
            onClick={handleDuplicatePrevious}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-lowest text-on-surface-variant shadow-sm transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            aria-label="Copiar del mes anterior"
            title="Copiar del mes anterior"
          >
            <Copy size={16} />
          </button>
        }
      />

      <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-28">
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-surface-lowest px-3 py-2 shadow-sm">
          <button
            type="button"
            onClick={() => setMonthKey((current) => shiftMonthKey(current, -1))}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-low text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-on-surface">{formatMonthLabel(monthKey)}</p>
            {!isCurrentMonth ? (
              <button
                type="button"
                onClick={() => setMonthKey(getMonthKey())}
                className="text-[11px] font-semibold text-primary underline underline-offset-2"
              >
                Ir al mes actual
              </button>
            ) : (
              <p className="text-[11px] text-on-surface-variant">Mes en curso</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMonthKey((current) => shiftMonthKey(current, 1))}
            disabled={isCurrentMonth}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-low text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Resumen del mes
              </p>
              <p className="mt-1 text-2xl font-bold text-on-surface">{formatCurrency(totalSpent)}</p>
              <p className="text-sm text-on-surface-variant">Gastado en categorías</p>
            </div>
            <div className="rounded-full bg-primary/10 p-3 text-primary">
              <PiggyBank size={22} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface-low px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Presupuesto
              </p>
              <p className="mt-1 text-base font-bold text-on-surface">
                {configuredCount > 0 ? formatCurrency(totalLimit) : "Sin definir"}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-low px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Restante
              </p>
              <p
                className={`mt-1 text-base font-bold ${
                  configuredCount === 0
                    ? "text-on-surface-variant"
                    : totalRemaining >= 0
                      ? "text-primary"
                      : "text-rose-600"
                }`}
              >
                {configuredCount > 0 ? formatCurrency(totalRemaining) : "—"}
              </p>
            </div>
          </div>
        </Card>

        {!hasAnyLimit(monthKey) ? (
          <Card className="mt-4 p-4">
            <p className="text-sm font-semibold text-on-surface">Empieza con tu presupuesto</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Toca una categoría para definir cuánto quieres gastar este mes. También puedes copiar el mes anterior.
            </p>
            <Link
              href="/categories"
              className="mt-3 inline-flex text-sm font-semibold text-primary underline underline-offset-2"
            >
              Administrar categorías
            </Link>
          </Card>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-3xl bg-surface-lowest shadow-sm">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-on-surface-variant">
              Por categoría
            </p>
            <span className="text-[11px] text-on-surface-variant">{configuredCount} con límite</span>
          </div>

          <div className="divide-y divide-outline-variant/20">
            {rows.map((row) => {
              const Icon = row.display.icon;
              const progress =
                row.limit > 0 ? Math.min((row.spent / row.limit) * 100, 100) : 0;

              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openLimitEditor(row.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                >
                  <div className="rounded-full bg-surface-low p-2 text-primary">
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-on-surface">{row.display.label}</p>
                      <PencilLine size={14} className="shrink-0 text-outline-variant" />
                    </div>

                    <div className="mt-1 flex items-baseline justify-between gap-2">
                      <p className="text-xs text-on-surface-variant">
                        {formatCurrency(row.spent)}
                        {row.limit > 0 ? ` / ${formatCurrency(row.limit)}` : " • sin límite"}
                      </p>
                      {row.limit > 0 ? (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            row.state === "over"
                              ? "text-rose-600"
                              : row.state === "warning"
                                ? "text-accent"
                                : "text-primary"
                          }`}
                        >
                          {row.state === "over"
                            ? "Excedido"
                            : row.state === "warning"
                              ? "Cerca"
                              : "OK"}
                        </span>
                      ) : null}
                    </div>

                    {row.limit > 0 ? (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-low">
                        <div
                          className={`h-full rounded-full transition-all ${
                            row.state === "over"
                              ? "bg-rose-500"
                              : row.state === "warning"
                                ? "bg-accent"
                                : "bg-primary"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <NumericKeypadSheet
        isOpen={Boolean(editingCategoryId)}
        title={
          editingCategory
            ? `PRESUPUESTO • ${editingCategory.label.toUpperCase()}`
            : "PRESUPUESTO"
        }
        initialValue={draftLimit}
        onClose={closeLimitEditor}
        onValueChange={setDraftLimit}
        onConfirm={confirmLimit}
      />

      {toast ? (
        <div className="fixed top-6 left-1/2 z-200 -translate-x-1/2 animate-in slide-in-from-top-3 fade-in duration-300">
          <div className="rounded-2xl bg-on-surface/95 px-5 py-3 text-sm font-medium text-on-primary shadow-xl backdrop-blur-sm">
            {toast}
          </div>
        </div>
      ) : null}
    </div>
  );
}
