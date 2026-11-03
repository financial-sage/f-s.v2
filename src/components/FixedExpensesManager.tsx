"use client";

import { FormattedCurrency } from "@/components/FormattedCurrency";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit,
  Plus,
  Trash2,
} from "lucide-react";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { useCurrency } from "@/hooks/useCurrency";
import { useFixedExpenses } from "@/hooks/useFixedExpenses";
import { formatMonthLabel, getMonthKey, shiftMonthKey } from "@/lib/budget";
import type { FixedExpenseMonthItem } from "@/lib/fixed-expenses/types";
import {
  FIXED_EXPENSE_FREQUENCIES,
  FREQUENCY_LABELS,
  frequencyShortHint,
  monthlyEquivalent,
  type FixedExpenseFrequency,
} from "@/lib/fixed-expenses/frequency";
import type { FixedExpenseScope } from "@/lib/fixed-expenses/scope";
import { tintedGlassGradient } from "@/lib/glass";
import { FIXED_EXPENSES_FUND_COLOR } from "@/lib/funds";
import { isIndividualHousehold } from "@/lib/household";
import {
  computeFixedExpenseTotals,
  useFixedExpensesStore,
} from "@/store/useFixedExpensesStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Portal } from "@/components/ui/Portal";
import { Sheet } from "@/components/ui/Sheet";
import ProductTour from "@/components/ProductTour";
import { useProductTour } from "@/hooks/useProductTour";
import type { ProductTourStep } from "@/components/ProductTour";

const ACCENT = FIXED_EXPENSES_FUND_COLOR;

function progressRatio(spent: number, budget: number) {
  if (budget <= 0) return 0;
  return Math.min(1, spent / budget);
}

function defaultPayDate(monthKey: string) {
  const today = new Date().toISOString().slice(0, 10);
  if (monthKey === getMonthKey()) return today;
  const day = Math.min(Number(today.slice(8, 10)) || 1, 28);
  return `${monthKey}-${String(day).padStart(2, "0")}`;
}

function formatPaidDate(paidAt: string | null) {
  if (!paidAt) return null;
  const dayKey = paidAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return null;
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${dayKey}T12:00:00`));
}

function formatVarianceHint(variance: number, formatCurrency: (n: number) => string) {
  if (Math.abs(variance) < 0.005) return null;
  const abs = formatCurrency(Math.abs(variance));
  return variance > 0 ? `+${abs}` : `−${abs}`;
}

function ChecklistRow({
  item,
  isSaving,
  formatCurrency,
  actionsOpen,
  onToggleActions,
  onTogglePaid,
  onEdit,
  onDelete,
}: {
  item: FixedExpenseMonthItem;
  isSaving: boolean;
  formatCurrency: (n: number) => string;
  actionsOpen: boolean;
  onToggleActions: () => void;
  onTogglePaid: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isPaid = item.payment.status === "paid";
  const baseAmount = Number(item.payment.base_value_snapshot || 0);
  const realAmount = Number(item.payment.real_value ?? 0);
  const rowAmount = isPaid ? realAmount : baseAmount;
  const variance = isPaid ? realAmount - baseAmount : 0;
  const varianceHint = formatVarianceHint(variance, formatCurrency);
  const paidLabel = formatPaidDate(item.payment.paid_at);
  const frequency = item.template.frequency ?? "monthly";
  const dueDay = item.template.due_day;
  const dueHint =
    dueDay != null && Number.isFinite(dueDay) ? `Día ${dueDay}` : null;
  const freqHint =
    frequency !== "monthly"
      ? `${FREQUENCY_LABELS[frequency]}${
          frequencyShortHint(frequency, baseAmount)
            ? ` · ${frequencyShortHint(frequency, baseAmount)}`
            : ""
        }`
      : null;
  const metaParts = [dueHint, !isPaid ? freqHint : null].filter(Boolean);

  return (
    <div
      className={`group relative flex items-stretch overflow-hidden ${
        isPaid ? "bg-glass-muted/60" : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggleActions}
        className={`flex min-w-0 flex-1 items-center gap-2.5 px-3.5 py-3 text-left transition-colors ${
          actionsOpen ? "bg-glass-soft" : ""
        }`}
      >
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-[14px] font-medium tracking-tight ${
              isPaid
                ? "text-on-surface-variant line-through decoration-outline-variant/45"
                : "text-on-surface"
            }`}
          >
            {item.template.name}
          </p>
          {isPaid && paidLabel ? (
            <p className="mt-0.5 text-[11px] font-light capitalize text-on-surface-variant">
              Pagado · {paidLabel}
            </p>
          ) : metaParts.length > 0 ? (
            <p className="mt-0.5 text-[11px] font-light text-on-surface-variant">
              {metaParts.join(" · ")}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span
            className={`text-[14px] font-light tabular-nums tracking-tight ${
              isPaid ? "text-on-surface-variant" : "text-on-surface"
            }`}
          >
            <FormattedCurrency value={rowAmount} />
          </span>
          {varianceHint ? (
            <span
              className={`text-[10px] font-medium tabular-nums ${
                variance > 0 ? "text-amber-800/70" : "text-emerald-700/80"
              }`}
            >
              {varianceHint}
            </span>
          ) : null}
        </div>
      </button>

      <button
        type="button"
        disabled={isSaving}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePaid();
        }}
        className={`shrink-0 self-center px-3 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ${
          isPaid
            ? "text-on-surface-variant/75 hover:text-on-surface"
            : "hover:opacity-80"
        }`}
        style={isPaid ? undefined : { color: ACCENT }}
      >
        {isPaid ? "Deshacer" : "Pagar"}
      </button>

      <div
        className={`flex shrink-0 flex-col overflow-hidden border-l border-outline-variant/20 transition-all duration-300 ease-out ${
          actionsOpen
            ? "w-14 opacity-100"
            : "w-0 border-transparent opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex flex-1 items-center justify-center border-b border-outline-variant/20 bg-surface-low/70 text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          aria-label={`Editar ${item.template.name}`}
        >
          <Edit size={16} />
        </button>
        <button
          type="button"
          disabled={isSaving}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex flex-1 items-center justify-center bg-error/15 text-error transition-colors hover:bg-error/25 disabled:opacity-50"
          aria-label={`Eliminar ${item.template.name}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

interface FixedExpensesManagerProps {
  currentUserId: string;
  familyMemberCount?: number;
}

export default function FixedExpensesManager({
  currentUserId,
  familyMemberCount = 1,
}: FixedExpensesManagerProps) {
  const { format: formatCurrency } = useCurrency();
  const isIndividual = isIndividualHousehold(familyMemberCount);

  const fixedTourSteps = useMemo<ProductTourStep[]>(
    () => [
      {
        target: "fixed-month",
        title: "Mes a mes",
        body: isIndividual
          ? "Cambia de mes para ver qué tienes pendiente y qué ya pagaste."
          : "El mismo mes para los dos: ven qué falta y qué ya está pagado.",
      },
      {
        target: "fixed-summary",
        title: "Cuánto falta",
        body: "Aquí ves lo que queda por pagar y el saldo del bolsillo de fijos. Aporta cuando organicen el mes.",
      },
    ],
    [isIndividual]
  );
  const fixedTour = useProductTour(currentUserId, "fixedExpenses", fixedTourSteps, {
    hasFamily: true,
  });

  const [monthKey, setMonthKey] = useState(getMonthKey());
  const {
    items: allItems,
    isLoading,
    isSaving,
    error,
    createTemplate,
    updateTemplate,
    deactivateTemplate,
    deposit,
    markPaid,
    unmarkPaid,
  } = useFixedExpenses(monthKey);
  const snapshot = useFixedExpensesStore((s) => s.snapshot);

  const [scopeTab, setScopeTab] = useState<FixedExpenseScope>("shared");
  const showScopeTabs = !isIndividual;

  const items = useMemo(
    () =>
      showScopeTabs
        ? allItems.filter((item) => (item.template.scope ?? "shared") === scopeTab)
        : allItems,
    [allItems, scopeTab, showScopeTabs]
  );

  const totals = useMemo(
    () =>
      computeFixedExpenseTotals(
        snapshot,
        showScopeTabs ? { scope: scopeTab } : undefined
      ),
    [snapshot, scopeTab, showScopeTabs]
  );

  const [payTarget, setPayTarget] = useState<FixedExpenseMonthItem | null>(null);
  const [payValue, setPayValue] = useState("0");
  const [payDate, setPayDate] = useState(() => defaultPayDate(getMonthKey()));
  const [payError, setPayError] = useState("");

  const [depositOpen, setDepositOpen] = useState(false);
  const [depositValue, setDepositValue] = useState("0");
  const [depositError, setDepositError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formBase, setFormBase] = useState("0");
  /** Empty string = no due day; otherwise 1–30. */
  const [formDueDay, setFormDueDay] = useState("");
  const [formDueDayOpen, setFormDueDayOpen] = useState(false);
  const [formFrequency, setFormFrequency] = useState<FixedExpenseFrequency>("monthly");
  const [formScope, setFormScope] = useState<FixedExpenseScope>("shared");
  const [formMoreOpen, setFormMoreOpen] = useState(false);
  const [formBaseKeypadOpen, setFormBaseKeypadOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [paidSheetOpen, setPaidSheetOpen] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const pendingScrollRef = useRef<HTMLDivElement | null>(null);

  const pendingItems = useMemo(
    () => items.filter((item) => item.payment.status === "pending"),
    [items]
  );
  const paidItems = useMemo(
    () => items.filter((item) => item.payment.status === "paid"),
    [items]
  );

  const remainingToPay = useMemo(
    () =>
      Math.round(
        pendingItems.reduce(
          (sum, item) => sum + Number(item.payment.base_value_snapshot || 0),
          0
        ) * 100
      ) / 100,
    [pendingItems]
  );

  const paidTotal = useMemo(
    () =>
      Math.round(
        paidItems.reduce((sum, item) => sum + Number(item.payment.real_value ?? 0), 0) * 100
      ) / 100,
    [paidItems]
  );

  const ratio = progressRatio(totals.sumReal, totals.sumBase);

  useEffect(() => {
    setPaidSheetOpen(false);
    if (pendingScrollRef.current) pendingScrollRef.current.scrollTop = 0;
  }, [monthKey, scopeTab]);

  useEffect(() => {
    if (paidItems.length === 0) setPaidSheetOpen(false);
  }, [paidItems.length]);

  function shiftMonth(delta: -1 | 1) {
    setMonthKey((key) => shiftMonthKey(key, delta));
  }

  function openPay(item: FixedExpenseMonthItem) {
    setPayTarget(item);
    setPayValue(String(item.payment.base_value_snapshot || 0));
    setPayDate(defaultPayDate(monthKey));
    setPayError("");
  }

  async function confirmPay(value?: string) {
    if (!payTarget) return;
    const amount = Number((value ?? payValue).replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError("Ingresa un valor real válido.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payDate)) {
      setPayError("Elige una fecha de pago válida.");
      return;
    }
    try {
      await markPaid(payTarget.payment.id, amount, payDate);
      // If the pay date belongs to another month, jump the header to that month.
      const paidMonthKey = payDate.slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(paidMonthKey) && paidMonthKey !== monthKey) {
        setMonthKey(paidMonthKey);
      }
      setPayTarget(null);
      setPayError("");
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "No se pudo registrar el pago."
      );
    }
  }

  function openDepositEditor() {
    setDepositValue("0");
    setDepositError("");
    setDepositOpen(true);
  }

  async function confirmDeposit(value?: string) {
    const amount = Number((value ?? depositValue).replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setDepositError("Ingresa un importe válido.");
      return;
    }
    try {
      await deposit(amount);
      setDepositOpen(false);
      setDepositError("");
    } catch (err) {
      setDepositError(err instanceof Error ? err.message : "No se pudo registrar el aporte.");
    }
  }

  function openCreateForm() {
    setEditingId(null);
    setFormName("");
    setFormBase("0");
    setFormDueDay("");
    setFormDueDayOpen(false);
    setFormFrequency("monthly");
    setFormScope(showScopeTabs ? scopeTab : "shared");
    setFormMoreOpen(false);
    setFormBaseKeypadOpen(false);
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(item: FixedExpenseMonthItem) {
    setEditingId(item.template.id);
    setFormName(item.template.name);
    setFormBase(String(item.template.base_value));
    setFormDueDay(
      item.template.due_day != null && Number.isFinite(item.template.due_day)
        ? String(item.template.due_day)
        : ""
    );
    setFormDueDayOpen(false);
    setFormFrequency(item.template.frequency ?? "monthly");
    setFormScope(item.template.scope ?? "shared");
    setFormMoreOpen((item.template.frequency ?? "monthly") !== "monthly");
    setFormBaseKeypadOpen(false);
    setFormError("");
    setFormOpen(true);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const baseValue = Number(formBase.replace(",", "."));
    if (!formName.trim()) {
      setFormError("Escribe un nombre.");
      return;
    }
    if (!Number.isFinite(baseValue) || baseValue < 0) {
      setFormError("Ingresa un valor base válido.");
      return;
    }

    const anchorMonth = Number(monthKey.slice(5, 7)) || 1;
    const dueDayParsed = formDueDay.trim() === "" ? null : Number(formDueDay);
    const dueDay =
      dueDayParsed == null || !Number.isFinite(dueDayParsed)
        ? null
        : Math.min(30, Math.max(1, Math.round(dueDayParsed)));

    try {
      if (editingId) {
        await updateTemplate({
          id: editingId,
          name: formName,
          baseValue,
          dueDay,
          frequency: formFrequency,
          anchorMonth,
        });
      } else {
        await createTemplate({
          name: formName,
          baseValue,
          dueDay,
          frequency: formFrequency,
          anchorMonth,
          scope: showScopeTabs ? formScope : "shared",
        });
        if (showScopeTabs) setScopeTab(formScope);
      }
      setFormOpen(false);
    } catch (err) {
      const raw =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "No se pudo guardar.";
      // Next hides Server Action / RSC digests as React #441 in some builds.
      const message =
        /minified react error #441|server components render|digest/i.test(raw)
          ? "No se pudo guardar el gasto fijo. Revisa la conexión e inténtalo de nuevo."
          : raw;
      setFormError(message);
    }
  }

  function renderRow(item: FixedExpenseMonthItem) {
    const isPaid = item.payment.status === "paid";
    const rowId = item.payment.id;
    return (
      <ChecklistRow
        key={rowId}
        item={item}
        isSaving={isSaving}
        formatCurrency={formatCurrency}
        actionsOpen={activeActionId === rowId}
        onToggleActions={() =>
          setActiveActionId((prev) => (prev === rowId ? null : rowId))
        }
        onTogglePaid={() => {
          if (isPaid) {
            void unmarkPaid(item.payment.id);
            return;
          }
          openPay(item);
        }}
        onEdit={() => {
          setActiveActionId(null);
          openEditForm(item);
        }}
        onDelete={() => {
          setActiveActionId(null);
          void deactivateTemplate(item.template.id);
        }}
      />
    );
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-page-gradient text-on-surface">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48"
        style={{
          backgroundImage: `radial-gradient(ellipse at bottom, ${ACCENT}18, transparent 72%)`,
        }}
      />

      <header className="relative z-50 flex w-full shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-[max(0.75rem,var(--safe-top))]">
        <div className="w-9" aria-hidden />
        <div
          className="flex min-w-0 flex-1 items-center justify-center gap-1"
          data-tour="fixed-month"
        >
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-glass-soft"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="min-w-0 text-center">
            <p className="text-[10px] font-light uppercase tracking-wider text-on-surface-variant">
              {isIndividual ? "Mis pagos fijos" : "Gastos fijos"}
            </p>
            <h1 className="truncate text-[15px] font-medium tracking-tight text-on-surface capitalize">
              {formatMonthLabel(monthKey)}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-glass-soft"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-full border border-glass-border bg-glass-strong p-2 text-on-surface shadow-sm backdrop-blur-sm transition-colors hover:bg-glass-soft"
          aria-label="Agregar gasto fijo"
        >
          <Plus size={18} strokeWidth={2.2} />
        </button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 min-h-0 flex-col overflow-hidden px-4">
        {showScopeTabs ? (
          <div className="mb-2.5 flex shrink-0 rounded-full border border-outline-variant/20 bg-glass-soft p-0.5">
            {(
              [
                { id: "shared" as const, label: "Familia" },
                { id: "personal" as const, label: "Míos" },
              ] as const
            ).map((tab) => {
              const active = scopeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setScopeTab(tab.id)}
                  className={`flex-1 rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                    active
                      ? "bg-glass-strong font-medium text-on-surface shadow-sm"
                      : "font-light text-on-surface-variant"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Sticky summary — always visible, single surface */}
        <div
          data-tour="fixed-summary"
          className="shrink-0 rounded-[1.35rem] border border-glass-border px-4 py-3.5 shadow-[0_8px_20px_rgba(43,52,55,0.08)]"
          style={{
            backgroundColor: "var(--surface-lowest)",
            backgroundImage: tintedGlassGradient(ACCENT, {
              soft: true,
              midAlpha: "22",
              endAlpha: "30",
              midStop: 55,
            }),
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-light text-on-surface-variant">
              {totals.paidCount}/{totals.totalCount} pagados
            </p>
            <p className="text-[11px] font-light tabular-nums text-on-surface-variant">
              Este mes <FormattedCurrency value={totals.sumBase} />
            </p>
          </div>
          {totals.monthlyCommitted > 0 &&
          Math.abs(totals.monthlyCommitted - totals.sumBase) > 0.009 ? (
            <p className="mt-1.5 text-[10px] font-light text-on-surface-variant">
              Peso mensual ≈ <FormattedCurrency value={totals.monthlyCommitted} />
            </p>
          ) : null}
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-glass-soft">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${ratio * 100}%`,
                backgroundImage: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}B0)`,
              }}
            />
          </div>

          <div className="mt-3.5 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">
                Falta
              </p>
              <p className="mt-0.5 truncate text-[1.35rem] font-light leading-none tracking-tight text-on-surface tabular-nums">
                <FormattedCurrency value={remainingToPay} />
              </p>
            </div>
            <div className={`min-w-0 ${scopeTab === "personal" && showScopeTabs ? "text-right" : ""}`}>
              <p className="text-[10px] font-light uppercase tracking-wider text-on-surface-variant">
                {scopeTab === "personal" && showScopeTabs ? "Mi bolsillo" : "Bolsillo"}
              </p>
              <p className="mt-0.5 truncate text-[15px] font-light leading-none tracking-tight text-on-surface-variant tabular-nums">
                <FormattedCurrency value={totals.pocketBalance} />
              </p>
            </div>
            {scopeTab === "shared" || !showScopeTabs ? (
              <button
                type="button"
                onClick={openDepositEditor}
                className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ backgroundColor: ACCENT }}
              >
                Aportar
              </button>
            ) : null}
          </div>
        </div>

        <section className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden pb-[var(--fab-clearance)]">
          {error ? (
            <div className="alert-error mb-3 shrink-0 rounded-2xl px-4 py-3 text-sm">{error}</div>
          ) : null}

          {isLoading ? (
            <div className="space-y-4" aria-hidden>
              <div className="h-4 w-24 animate-pulse rounded bg-on-surface/8" />
              <div className="overflow-hidden rounded-[1.35rem] border border-glass-border bg-glass-soft">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 px-3.5 py-3.5 ${
                      i > 0 ? "border-t border-outline-variant/10" : ""
                    }`}
                  >
                    <div className="h-[1.125rem] w-[1.125rem] animate-pulse rounded-full bg-on-surface/10" />
                    <div className="h-3.5 flex-1 animate-pulse rounded bg-on-surface/8" />
                    <div className="h-3.5 w-14 animate-pulse rounded bg-on-surface/8" />
                  </div>
                ))}
              </div>
            </div>
          ) : items.length === 0 ? (
            <button
              type="button"
              onClick={openCreateForm}
              className="flex w-full flex-col items-center gap-2 px-4 py-14 text-center"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
              >
                <Plus size={18} />
              </span>
              <span className="text-sm font-medium text-on-surface">
                {showScopeTabs && scopeTab === "personal"
                  ? "Añade tu primer gasto fijo personal"
                  : "Añade tu primer gasto fijo"}
              </span>
              <span className="max-w-[240px] text-xs font-light text-on-surface-variant">
                {showScopeTabs && scopeTab === "personal"
                  ? "Gimnasio, streaming, seguro… se descuenta de Mi bolsillo."
                  : "Luz, agua, alquiler… y ve tachándolos cada mes."}
              </span>
            </button>
          ) : (
            <>
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="mb-2 flex shrink-0 items-baseline justify-between gap-3 px-1">
                  <h2 className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
                    Por pagar
                    <span className="ml-1.5 font-light normal-case tracking-normal tabular-nums">
                      · {pendingItems.length}
                    </span>
                  </h2>
                  {paidItems.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setPaidSheetOpen(true)}
                      className="inline-flex items-center gap-0.5 text-[11px] font-medium text-on-surface-variant transition-colors hover:text-on-surface"
                      aria-haspopup="dialog"
                    >
                      Pagados · {paidItems.length}
                      <ChevronRight size={12} strokeWidth={1.75} className="opacity-60" />
                    </button>
                  ) : null}
                </div>

                {pendingItems.length === 0 ? (
                  <p className="px-1 py-6 text-center text-sm font-light text-on-surface-variant">
                    Todo pagado este mes
                  </p>
                ) : (
                  <div
                    ref={pendingScrollRef}
                    className="min-h-0 flex-1 overflow-y-auto overscroll-none no-scrollbar"
                  >
                    <div className="overflow-hidden rounded-[1.35rem] border border-glass-border bg-glass-strong shadow-[0_8px_22px_rgba(43,52,55,0.08)] backdrop-blur-xl divide-y divide-outline-variant/12">
                      {pendingItems.map(renderRow)}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      <Sheet
        open={paidSheetOpen}
        onClose={() => setPaidSheetOpen(false)}
        title="Pagados"
        subtitle={`${paidItems.length} ${
          paidItems.length === 1 ? "gasto" : "gastos"
        } · ${formatCurrency(paidTotal)}`}
        headerLayout="title-row"
        closeOnBackdrop
        heightClassName="h-auto max-h-[85dvh]"
      >
        <div className="-mx-5 overflow-hidden divide-y divide-outline-variant/12 border-t border-outline-variant/12">
          {paidItems.map(renderRow)}
        </div>
      </Sheet>

      <NumericKeypadSheet
        isOpen={Boolean(payTarget)}
        title={payTarget ? `Pagar ${payTarget.template.name}` : "Pagar"}
        subtitle={
          payTarget?.template.scope === "personal"
            ? "Se descuenta de Mi bolsillo"
            : "Valor real · bolsillo de fijos"
        }
        initialValue={payValue}
        errorMessage={payError}
        dateValue={payDate}
        onDateChange={setPayDate}
        dateLabel="Fecha de pago"
        onClose={() => setPayTarget(null)}
        onValueChange={setPayValue}
        onConfirm={(value) => void confirmPay(value)}
      />

      <NumericKeypadSheet
        isOpen={depositOpen}
        title="Aportar al bolsillo"
        subtitle="Aporte al bolsillo compartido de gastos fijos. Queda en el historial."
        initialValue={depositValue}
        errorMessage={depositError}
        onClose={() => setDepositOpen(false)}
        onValueChange={setDepositValue}
        onConfirm={(value) => void confirmDeposit(value)}
      />

      <NumericKeypadSheet
        isOpen={formOpen && formBaseKeypadOpen}
        title={formFrequency === "monthly" ? "Valor base" : "Valor del periodo"}
        subtitle={
          formFrequency === "monthly"
            ? "Previsión mensual de este gasto"
            : `Importe ${FREQUENCY_LABELS[formFrequency].toLowerCase()}`
        }
        accentColor={ACCENT}
        initialValue={formBase || "0"}
        onClose={() => setFormBaseKeypadOpen(false)}
        onValueChange={setFormBase}
        onConfirm={(value) => {
          setFormBase(value ?? formBase);
          setFormBaseKeypadOpen(false);
        }}
      />

      {formOpen ? (
        <Portal>
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-on-surface/[0.22] backdrop-blur-[10px] sm:items-center">
          <div className="w-full max-w-md rounded-t-[1.75rem] border border-outline-variant/20 bg-surface-lowest/98 p-6 shadow-[0_-8px_40px_rgba(28,39,64,0.08)] backdrop-blur-xl sm:rounded-[1.75rem]">
            <div className="mx-auto mb-4 h-0.5 w-8 rounded-full bg-outline-variant/25 sm:hidden" />
            <h3 className="text-[1.35rem] font-light tracking-tight text-on-surface">
              {editingId ? "Editar gasto fijo" : "Nuevo gasto fijo"}
            </h3>
            <p className="mt-2 text-[13px] font-light leading-relaxed text-on-surface-variant">
              {formFrequency === "monthly"
                ? "El valor base se usa como previsión del mes."
                : `Se paga ${FREQUENCY_LABELS[formFrequency].toLowerCase()}; equivale a ~${formatCurrency(
                    monthlyEquivalent(
                      Number(formBase.replace(",", ".") || 0),
                      formFrequency
                    )
                  )}/mes.`}
            </p>

            <form onSubmit={(e) => void submitForm(e)} className="mt-4 space-y-4">
              {showScopeTabs && !editingId ? (
                <div className="space-y-2">
                  <span className="ml-1 block text-[11px] font-light text-on-surface-variant">
                    ¿De quién es?
                  </span>
                  <div className="flex gap-1.5">
                    {(
                      [
                        {
                          id: "shared" as const,
                          label: "Familia",
                          hint: "Bolsillo de fijos",
                        },
                        {
                          id: "personal" as const,
                          label: "Solo mío",
                          hint: "Mi bolsillo",
                        },
                      ] as const
                    ).map((opt) => {
                      const active = formScope === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFormScope(opt.id)}
                          className={`flex-1 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                            active
                              ? "border-primary/35 bg-primary/10"
                              : "border-outline-variant/25 bg-glass"
                          }`}
                        >
                          <span
                            className={`block text-[13px] ${
                              active
                                ? "font-medium text-on-surface"
                                : "font-light text-on-surface"
                            }`}
                          >
                            {opt.label}
                          </span>
                          <span className="mt-0.5 block text-[10px] font-light text-on-surface-variant">
                            {opt.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <Input
                label="Nombre"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={
                  formScope === "personal"
                    ? "Gimnasio, streaming…"
                    : "Luz, agua, seguro…"
                }
                required
              />
              <div className="space-y-2">
                <label
                  htmlFor="fixed-expense-base-value"
                  className="ml-1 block text-[11px] font-light text-on-surface-variant"
                >
                  Valor {formFrequency === "monthly" ? "base" : "del periodo"}
                </label>
                <div className="relative">
                  <input
                    id="fixed-expense-base-value"
                    type="text"
                    inputMode="none"
                    readOnly
                    value={formatCurrency(Number(formBase.replace(",", ".") || 0))}
                    onFocus={(e) => {
                      e.currentTarget.blur();
                      setFormBaseKeypadOpen(true);
                    }}
                    onClick={() => setFormBaseKeypadOpen(true)}
                    className="w-full cursor-pointer rounded-2xl border border-outline-variant/30 bg-glass px-5 py-3.5 pr-16 text-left text-[15px] font-medium tracking-tight text-on-surface tabular-nums outline-none shadow-sm backdrop-blur-sm transition-all focus:border-primary/35 focus:ring-2 focus:ring-primary/15"
                    aria-haspopup="dialog"
                    aria-expanded={formBaseKeypadOpen}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-medium text-on-surface-variant">
                    Editar
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setFormDueDayOpen((open) => !open)}
                  className="flex w-full items-center justify-between gap-2 rounded-2xl border border-outline-variant/30 bg-glass px-4 py-3 text-left shadow-sm backdrop-blur-sm transition-colors hover:border-outline-variant/45"
                  aria-expanded={formDueDayOpen}
                >
                  <span className="min-w-0">
                    <span className="block text-[11px] font-light text-on-surface-variant">
                      Día de pago
                    </span>
                    <span className="mt-0.5 block text-[14px] font-medium tabular-nums text-on-surface">
                      {formDueDay ? `Día ${formDueDay}` : "Sin día definido"}
                    </span>
                  </span>
                  <ChevronDown
                    size={16}
                    strokeWidth={1.75}
                    className={`shrink-0 text-on-surface-variant transition-transform ${
                      formDueDayOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {formDueDayOpen ? (
                  <div
                    className="rounded-2xl border border-outline-variant/20 bg-glass/80 p-2.5 shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-top-1 duration-200"
                    role="group"
                    aria-label="Elegir día de pago"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setFormDueDay("");
                        setFormDueDayOpen(false);
                      }}
                      className={`mb-2 w-full rounded-xl px-3 py-2 text-[12px] transition-colors ${
                        formDueDay === ""
                          ? "bg-primary/12 font-medium text-primary"
                          : "bg-surface/60 font-light text-on-surface-variant hover:bg-surface"
                      }`}
                    >
                      Sin día definido
                    </button>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                        const selected = formDueDay === String(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              setFormDueDay(String(day));
                              setFormDueDayOpen(false);
                            }}
                            aria-pressed={selected}
                            className={`flex h-9 items-center justify-center rounded-lg text-[12px] tabular-nums transition-colors ${
                              selected
                                ? "bg-primary font-semibold text-on-primary shadow-[0_4px_10px_rgba(28,39,64,0.18)]"
                                : "font-light text-on-surface hover:bg-on-surface/[0.05]"
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setFormMoreOpen((open) => !open)}
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-on-surface-variant transition-colors hover:text-on-surface"
                  aria-expanded={formMoreOpen}
                >
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${formMoreOpen ? "rotate-180" : ""}`}
                  />
                  Más opciones
                </button>
                {formMoreOpen ? (
                  <div className="mt-3 space-y-2">
                    <span className="ml-1 block text-[11px] font-light text-on-surface-variant">
                      ¿Cada cuánto?
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {FIXED_EXPENSE_FREQUENCIES.map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setFormFrequency(freq)}
                          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                            formFrequency === freq
                              ? "bg-primary/15 text-primary"
                              : "bg-surface text-on-surface-variant"
                          }`}
                        >
                          {FREQUENCY_LABELS[freq]}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {formError ? (
                <div className="alert-error rounded-2xl px-4 py-3 text-sm">{formError}</div>
              ) : null}

              <div className="flex gap-2">
                {editingId ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={isSaving}
                    onClick={() => {
                      void deactivateTemplate(editingId).then(() => setFormOpen(false));
                    }}
                  >
                    Archivar
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setFormBaseKeypadOpen(false);
                    setFormOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" isLoading={isSaving}>
                  Guardar
                </Button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      ) : null}

      <ProductTour
        open={fixedTour.open}
        steps={fixedTour.steps}
        onClose={fixedTour.close}
      />
    </div>
  );
}
