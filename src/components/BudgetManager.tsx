"use client";

import { FormattedCurrency } from "@/components/FormattedCurrency";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  PencilLine,
  PiggyBank,
} from "lucide-react";
import { useBudget } from "@/hooks/useBudget";
import {
  computeSpendingByParentCategory,
  type BudgetExpenseRow,
} from "@/lib/budgetSpending";
import {
  formatMonthLabel,
  getMonthKey,
  shiftMonthKey,
} from "@/lib/budget";
import { listFamilyCategoriesAction } from "@/app/actions/categories";
import {
  listParentCategories,
  resolveCategoryIcon,
  type CategoryScope,
  type FamilyCategory,
} from "@/lib/familyCategories";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useExpenseStore } from "@/store/useExpenseStore";
import { fundIconChipStyle } from "@/lib/funds";
import { isIndividualHousehold } from "@/lib/household";

type BudgetTab = CategoryScope;

const BUDGET_TABS: { id: BudgetTab; label: string }[] = [
  { id: "shared", label: "Familia" },
  { id: "personal", label: "Individual" },
];

interface BudgetManagerProps {
  familyId: string;
  currentUserId: string;
  familyMemberCount?: number;
  initialExpenses: BudgetExpenseRow[];
}

function getProgressState(spent: number, limit: number) {
  if (limit <= 0) return "none" as const;
  const ratio = spent / limit;
  if (ratio >= 1) return "over" as const;
  if (ratio >= 0.85) return "warning" as const;
  return "ok" as const;
}

export default function BudgetManager({
  familyId,
  currentUserId,
  familyMemberCount = 1,
  initialExpenses,
}: BudgetManagerProps) {
  const individual = isIndividualHousehold(familyMemberCount);
  const storeExpenses = useExpenseStore((s) => s.expenses);
  const isHydrated = useExpenseStore((s) => s.isHydrated);
  const [categories, setCategories] = useState<FamilyCategory[]>([]);
  const [catsLoading, setCatsLoading] = useState(true);

  const expenses = useMemo(() => {
    const preferStore =
      isHydrated && (storeExpenses.length > 0 || initialExpenses.length === 0);
    if (preferStore) return storeExpenses as BudgetExpenseRow[];
    return initialExpenses;
  }, [initialExpenses, isHydrated, storeExpenses]);

  const loadCats = useCallback(async () => {
    setCatsLoading(true);
    try {
      setCategories(await listFamilyCategoriesAction());
    } catch {
      setCategories([]);
    } finally {
      setCatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCats();
  }, [loadCats, familyId]);

  const { getLimits, setSegmentLimit, duplicateFromPreviousMonth } =
    useBudget(familyId);

  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [budgetTab, setBudgetTab] = useState<BudgetTab>(
    individual ? "personal" : "shared"
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLimit, setDraftLimit] = useState("0");
  const [toast, setToast] = useState<string | null>(null);

  const limits = getLimits(monthKey);
  const parents = useMemo(
    () => listParentCategories(categories, currentUserId),
    [categories, currentUserId]
  );

  const spending = useMemo(
    () => computeSpendingByParentCategory(expenses, monthKey, categories),
    [expenses, monthKey, categories]
  );

  const allRows = useMemo(() => {
    return parents
      .map((cat) => {
        const spent = spending.get(cat.id) ?? 0;
        const limit = limits[cat.id] ?? 0;
        return {
          id: cat.id,
          label: cat.name,
          color: cat.color,
          icon: cat.icon,
          scope: cat.scope,
          spent,
          limit,
          state: getProgressState(spent, limit),
        };
      })
      .sort((a, b) => {
        if (b.spent !== a.spent) return b.spent - a.spent;
        return a.label.localeCompare(b.label, "es");
      });
  }, [parents, spending, limits]);

  const rows = useMemo(() => {
    if (individual) return allRows;
    return allRows.filter((row) => row.scope === budgetTab);
  }, [allRows, budgetTab, individual]);

  const totalLimit = useMemo(
    () => rows.reduce((sum, row) => sum + row.limit, 0),
    [rows]
  );
  const totalSpent = useMemo(
    () => rows.reduce((sum, row) => sum + row.spent, 0),
    [rows]
  );
  const totalRemaining = totalLimit - totalSpent;
  const configuredCount = rows.filter((row) => row.limit > 0).length;
  const tabHasAnyLimit = configuredCount > 0;
  const isCurrentMonth = monthKey === getMonthKey();

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  function openLimitEditor(id: string) {
    const current = limits[id] ?? 0;
    setDraftLimit(current > 0 ? String(current) : "0");
    setEditingId(id);
  }

  function closeLimitEditor() {
    setEditingId(null);
    setDraftLimit("0");
  }

  function confirmLimit(value?: string) {
    if (!editingId) return;
    const normalized = Number(String(value ?? draftLimit).replace(/,/g, "."));
    if (!Number.isFinite(normalized) || normalized < 0) {
      showToast("Ingresa un monto válido.");
      return;
    }
    setSegmentLimit(monthKey, editingId, normalized);
    closeLimitEditor();
  }

  function handleDuplicatePrevious() {
    const copied = duplicateFromPreviousMonth(monthKey);
    showToast(
      copied
        ? "Presupuesto copiado del mes anterior."
        : "No hay presupuesto en el mes anterior."
    );
  }

  const editingLabel = editingId
    ? parents.find((p) => p.id === editingId)?.name ?? null
    : null;

  const totalProgress =
    totalLimit > 0 ? Math.min((totalSpent / totalLimit) * 100, 100) : 0;
  const totalState = getProgressState(totalSpent, totalLimit);

  if ((!isHydrated && initialExpenses.length === 0) || catsLoading) {
    return (
      <div className="h-dvh overflow-y-auto overscroll-y-contain no-scrollbar bg-surface">
        <PageHeader title="Presupuesto" subtitle={formatMonthLabel(monthKey)} />
        <div className="mx-auto w-full max-w-xl space-y-3 px-4 pb-[var(--fab-clearance)] pt-3">
          <Skeleton className="h-14 rounded-[1.1rem]" />
          <Skeleton className="h-28 rounded-[1.1rem]" />
          <Skeleton className="h-40 rounded-[1.1rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-dvh overflow-y-auto overscroll-y-contain no-scrollbar bg-surface">
      <PageHeader
        title="Presupuesto"
        subtitle={formatMonthLabel(monthKey)}
        right={
          <button
            type="button"
            onClick={handleDuplicatePrevious}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant/70 transition-colors hover:bg-on-surface/[0.04] hover:text-on-surface"
            aria-label="Copiar del mes anterior"
            title="Copiar del mes anterior"
          >
            <Copy size={15} strokeWidth={1.75} />
          </button>
        }
      />

      <main className="mx-auto w-full max-w-xl px-4 pt-3 pb-[var(--fab-clearance)]">
        {!individual ? (
          <div
            className="mb-3 grid grid-cols-2 gap-1 rounded-2xl border border-glass-border bg-glass-soft/80 p-1 backdrop-blur-md"
            role="tablist"
            aria-label="Ámbito del presupuesto"
          >
            {BUDGET_TABS.map((tab) => {
              const active = budgetTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setBudgetTab(tab.id)}
                  className={`rounded-xl px-2 py-2 text-[12px] font-light tracking-tight transition-colors ${
                    active
                      ? "bg-surface-lowest text-on-surface shadow-sm"
                      : "text-on-surface-variant"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="mb-3 flex items-center justify-between rounded-[1.1rem] border-[0.5px] border-outline-variant/20 bg-glass-soft/80 px-2 py-1.5 shadow-[0_4px_14px_rgba(43,52,55,0.04)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setMonthKey((c) => shiftMonthKey(c, -1))}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant/70 transition-colors hover:bg-on-surface/[0.04]"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
          </button>
          <div className="text-center">
            <p className="text-[13px] font-light tracking-tight text-on-surface">
              {formatMonthLabel(monthKey)}
            </p>
            {!isCurrentMonth ? (
              <button
                type="button"
                onClick={() => setMonthKey(getMonthKey())}
                className="text-[10px] font-light text-[#9a7b4f] underline underline-offset-2"
              >
                Ir al mes actual
              </button>
            ) : (
              <p className="text-[10px] font-light text-on-surface-variant/80">
                Mes en curso
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMonthKey((c) => shiftMonthKey(c, 1))}
            disabled={isCurrentMonth}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant/70 transition-colors hover:bg-on-surface/[0.04] disabled:opacity-35"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="rounded-[1.1rem] border-[0.5px] border-outline-variant/20 bg-glass-soft/80 px-3.5 py-3.5 shadow-[0_4px_14px_rgba(43,52,55,0.04)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-light uppercase tracking-[0.14em] text-on-surface-variant/80">
                {individual
                  ? "Gastado este mes"
                  : budgetTab === "shared"
                    ? "Gastado en familia"
                    : "Gastado individual"}
              </p>
              <p className="mt-1 text-[1.65rem] font-light tracking-tight tabular-nums text-on-surface">
                <FormattedCurrency value={totalSpent} />
              </p>
            </div>
            <span
              className="icon-chip-fund icon-chip-coin flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
              style={fundIconChipStyle("#c4a574")}
            >
              <PiggyBank size={15} strokeWidth={1.85} />
            </span>
          </div>

          {tabHasAnyLimit ? (
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-on-surface/[0.06]">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  totalState === "over"
                    ? "bg-amber-700/55"
                    : totalState === "warning"
                      ? "bg-[#c4a574]/80"
                      : "bg-[color-mix(in_srgb,#c4a574_55%,#5B7188)]"
                }`}
                style={{ width: `${totalProgress}%` }}
              />
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-on-surface/[0.03] px-2.5 py-2">
              <p className="text-[9px] font-light uppercase tracking-[0.12em] text-on-surface-variant/75">
                Presupuesto
              </p>
              <p className="mt-0.5 text-[13px] font-light tabular-nums text-on-surface">
                {tabHasAnyLimit ? (
                  <FormattedCurrency value={totalLimit} />
                ) : (
                  "Sin definir"
                )}
              </p>
            </div>
            <div className="rounded-xl bg-on-surface/[0.03] px-2.5 py-2">
              <p className="text-[9px] font-light uppercase tracking-[0.12em] text-on-surface-variant/75">
                Restante
              </p>
              <p
                className={`mt-0.5 text-[13px] font-light tabular-nums ${
                  !tabHasAnyLimit
                    ? "text-on-surface-variant"
                    : totalRemaining >= 0
                      ? "text-on-surface"
                      : "text-amber-800/70"
                }`}
              >
                {tabHasAnyLimit ? (
                  <FormattedCurrency value={totalRemaining} />
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>
        </div>

        {!tabHasAnyLimit ? (
          <p className="mt-3 px-1 text-[12px] font-light leading-snug text-on-surface-variant">
            {individual
              ? "Define límites para tus categorías. Las subcategorías suman al padre."
              : budgetTab === "shared"
                ? "Define límites para las categorías de la familia. Las subcategorías suman al padre."
                : "Define límites para tus categorías personales. Las subcategorías suman al padre."}{" "}
            <Link
              href="/categories"
              className="text-[#9a7b4f] underline underline-offset-2"
            >
              Administrar categorías
            </Link>
          </p>
        ) : null}

        <div className="mt-3.5 mb-1 flex items-center justify-between gap-2 px-1">
          <p className="text-[10px] font-light uppercase tracking-[0.14em] text-on-surface-variant/80">
            {individual
              ? "Tus categorías"
              : budgetTab === "shared"
                ? "Categorías familia"
                : "Categorías tuyas"}
          </p>
          <span className="text-[10px] font-light text-on-surface-variant/70">
            {configuredCount} con límite
          </span>
        </div>

        <div className="overflow-hidden rounded-[1.1rem] border-[0.5px] border-outline-variant/20 bg-glass-soft/80 shadow-[0_4px_14px_rgba(43,52,55,0.04)] backdrop-blur-xl">
          {rows.length === 0 ? (
            <p className="px-3.5 py-3 text-[12px] font-light text-on-surface-variant">
              {individual
                ? "Aún no hay categorías. "
                : budgetTab === "shared"
                  ? "Aún no hay categorías de familia. "
                  : "Aún no hay categorías individuales. "}
              <Link
                href="/categories"
                className="text-[#9a7b4f] underline underline-offset-2"
              >
                Crear en Categorías
              </Link>
            </p>
          ) : (
            <div>
              {rows.map((row, index) => {
                const progress =
                  row.limit > 0
                    ? Math.min((row.spent / row.limit) * 100, 100)
                    : 0;
                const Icon = resolveCategoryIcon(row.icon);

                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => openLimitEditor(row.id)}
                    className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-on-surface/[0.03] ${
                      index > 0 ? "border-t border-outline-variant/10" : ""
                    }`}
                  >
                    <div
                      className="icon-chip-fund icon-chip-coin flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border"
                      style={fundIconChipStyle(row.color || "#57534E")}
                    >
                      <Icon size={13} strokeWidth={1.85} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[13px] font-light tracking-tight text-on-surface">
                          {row.label}
                        </p>
                        <PencilLine
                          size={12}
                          strokeWidth={1.75}
                          className="shrink-0 text-on-surface-variant/45"
                        />
                      </div>

                      <div className="mt-0.5 flex items-baseline justify-between gap-2">
                        <p className="text-[11px] font-light tabular-nums text-on-surface-variant/85">
                          <FormattedCurrency value={row.spent} />
                          {row.limit > 0 ? (
                            <>
                              <span className="text-on-surface-variant/45">
                                {" / "}
                              </span>
                              <FormattedCurrency value={row.limit} />
                            </>
                          ) : (
                            <span className="text-on-surface-variant/55">
                              {" · sin límite"}
                            </span>
                          )}
                        </p>
                        {row.limit > 0 ? (
                          <span
                            className={`text-[9px] font-light tracking-wide ${
                              row.state === "over"
                                ? "text-amber-800/70"
                                : row.state === "warning"
                                  ? "text-[#9a7b4f]"
                                  : "text-on-surface-variant/60"
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
                        <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-on-surface/[0.06]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                              row.state === "over"
                                ? "bg-amber-700/55"
                                : row.state === "warning"
                                  ? "bg-[#c4a574]/80"
                                  : "bg-[color-mix(in_srgb,#c4a574_50%,#5B7188)]"
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
          )}
        </div>
      </main>

      <NumericKeypadSheet
        isOpen={Boolean(editingId)}
        title={
          editingLabel
            ? `PRESUPUESTO · ${editingLabel.toUpperCase()}`
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
