"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { useCurrency } from "@/hooks/useCurrency";
import { useFixedExpenses } from "@/hooks/useFixedExpenses";
import { formatMonthLabel, getMonthKey, shiftMonthKey } from "@/lib/budget";
import type { FixedExpenseMonthItem } from "@/lib/fixed-expenses/types";
import { tintedGlassGradient } from "@/lib/glass";
import { FIXED_EXPENSES_FUND_COLOR } from "@/lib/funds";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
  onTogglePaid,
  onOpenRow,
  onEditTemplate,
}: {
  item: FixedExpenseMonthItem;
  isSaving: boolean;
  formatCurrency: (n: number) => string;
  onTogglePaid: () => void;
  onOpenRow: () => void;
  onEditTemplate: () => void;
}) {
  const isPaid = item.payment.status === "paid";
  const baseAmount = Number(item.payment.base_value_snapshot || 0);
  const realAmount = Number(item.payment.real_value ?? 0);
  const rowAmount = isPaid ? realAmount : baseAmount;
  const variance = isPaid ? realAmount - baseAmount : 0;
  const varianceHint = formatVarianceHint(variance, formatCurrency);
  const paidLabel = formatPaidDate(item.payment.paid_at);

  return (
    <div
      className={`flex items-center gap-3 px-3.5 py-3 ${
        isPaid ? "bg-glass-muted/60" : ""
      }`}
    >
      <button
        type="button"
        disabled={isSaving}
        onClick={onTogglePaid}
        className={`flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${
          isPaid ? "text-white shadow-sm" : "border-outline-variant/45 bg-glass-strong text-transparent"
        }`}
        style={isPaid ? { backgroundColor: ACCENT, borderColor: `${ACCENT}66` } : undefined}
        aria-label={isPaid ? "Deshacer pago" : `Pagar ${item.template.name}`}
      >
        {isPaid ? <Check size={11} strokeWidth={2.75} /> : null}
      </button>

      <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpenRow}>
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
        ) : null}
      </button>

      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span
          className={`text-[14px] font-light tabular-nums tracking-tight ${
            isPaid ? "text-on-surface-variant" : "text-on-surface"
          }`}
        >
          {formatCurrency(rowAmount)}
        </span>
        {varianceHint ? (
          <span
            className={`text-[10px] font-medium tabular-nums ${
              variance > 0 ? "text-red-600/80" : "text-emerald-700/80"
            }`}
          >
            {varianceHint}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onEditTemplate}
        className="shrink-0 rounded-full p-1.5 text-outline-variant/70 transition-colors hover:bg-glass-strong hover:text-on-surface-variant"
        aria-label={`Editar plantilla ${item.template.name}`}
      >
        <MoreHorizontal size={16} strokeWidth={2} />
      </button>
    </div>
  );
}

export default function FixedExpensesManager() {
  const { format: formatCurrency } = useCurrency();
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const {
    items,
    totals,
    isLoading,
    isSaving,
    error,
    createTemplate,
    updateTemplate,
    deactivateTemplate,
    deposit,
    markPaid,
    updatePaid,
    unmarkPaid,
  } = useFixedExpenses(monthKey);

  const [payTarget, setPayTarget] = useState<FixedExpenseMonthItem | null>(null);
  const [payEditing, setPayEditing] = useState(false);
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
  const [formBaseKeypadOpen, setFormBaseKeypadOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [paidExpanded, setPaidExpanded] = useState(false);

  const pendingScrollRef = useRef<HTMLDivElement | null>(null);
  const paidScrollRef = useRef<HTMLDivElement | null>(null);

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
    setPaidExpanded(false);
    if (pendingScrollRef.current) pendingScrollRef.current.scrollTop = 0;
    if (paidScrollRef.current) paidScrollRef.current.scrollTop = 0;
  }, [monthKey]);

  function shiftMonth(delta: -1 | 1) {
    setMonthKey((key) => shiftMonthKey(key, delta));
  }

  function openPay(item: FixedExpenseMonthItem) {
    setPayEditing(false);
    setPayTarget(item);
    setPayValue(String(item.payment.base_value_snapshot || 0));
    setPayDate(defaultPayDate(monthKey));
    setPayError("");
  }

  function openEditPay(item: FixedExpenseMonthItem) {
    setPayEditing(true);
    setPayTarget(item);
    setPayValue(String(item.payment.real_value ?? item.payment.base_value_snapshot ?? 0));
    setPayDate(
      item.payment.paid_at?.slice(0, 10) &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.payment.paid_at.slice(0, 10))
        ? item.payment.paid_at.slice(0, 10)
        : defaultPayDate(monthKey)
    );
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
      if (payEditing) {
        await updatePaid(payTarget.payment.id, amount, payDate);
      } else {
        await markPaid(payTarget.payment.id, amount, payDate);
      }
      setPayTarget(null);
      setPayEditing(false);
      setPayError("");
    } catch (err) {
      setPayError(
        err instanceof Error
          ? err.message
          : payEditing
            ? "No se pudo actualizar el pago."
            : "No se pudo registrar el pago."
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
    setFormBaseKeypadOpen(false);
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(item: FixedExpenseMonthItem) {
    setEditingId(item.template.id);
    setFormName(item.template.name);
    setFormBase(String(item.template.base_value));
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

    try {
      if (editingId) {
        await updateTemplate({ id: editingId, name: formName, baseValue });
      } else {
        await createTemplate({ name: formName, baseValue });
      }
      setFormOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }

  function renderRow(item: FixedExpenseMonthItem) {
    const isPaid = item.payment.status === "paid";
    return (
      <ChecklistRow
        key={item.payment.id}
        item={item}
        isSaving={isSaving}
        formatCurrency={formatCurrency}
        onTogglePaid={() => {
          if (isPaid) {
            void unmarkPaid(item.payment.id);
            return;
          }
          openPay(item);
        }}
        onOpenRow={() => {
          if (isPaid) openEditPay(item);
          else openPay(item);
        }}
        onEditTemplate={() => openEditForm(item)}
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
        <Link
          href="/"
          className="rounded-full border border-glass-border bg-glass-strong p-2 text-on-surface-variant shadow-sm backdrop-blur-sm"
          aria-label="Volver al inicio"
        >
          <ChevronLeft size={18} />
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
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
              Gastos fijos
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
        {/* Sticky summary — always visible, single surface */}
        <div
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
              Base {formatCurrency(totals.sumBase)}
            </p>
          </div>
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
                {formatCurrency(remainingToPay)}
              </p>
            </div>
            <div className="min-w-0 text-right">
              <p className="text-[10px] font-light uppercase tracking-wider text-on-surface-variant">
                Bolsillo
              </p>
              <p className="mt-0.5 truncate text-[15px] font-light leading-none tracking-tight text-on-surface-variant tabular-nums">
                {formatCurrency(totals.pocketBalance)}
              </p>
            </div>
            <button
              type="button"
              onClick={openDepositEditor}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: ACCENT }}
            >
              Aportar
            </button>
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
              <span className="text-sm font-medium text-on-surface">Añade tu primer gasto fijo</span>
              <span className="max-w-[240px] text-xs font-light text-on-surface-variant">
                Luz, agua, gimnasio… y ve tachándolos cada mes.
              </span>
            </button>
          ) : (
            <>
              {/* Por pagar: shrinks when Pagados expands (no overlap) */}
              <div
                className={`flex min-h-0 flex-col ${
                  paidExpanded && paidItems.length > 0 ? "min-h-[7rem] flex-1" : "flex-1"
                }`}
              >
                <div className="mb-2 flex shrink-0 items-baseline justify-between gap-3 px-1">
                  <h2 className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
                    Por pagar
                  </h2>
                  <span className="text-[11px] font-light tabular-nums text-on-surface-variant">
                    {pendingItems.length}
                  </span>
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

              {/* Pagados: collapsed = bar; expanded = fixed-height slot that reserves space */}
              {paidItems.length > 0 ? (
                <div
                  className="mt-2 flex min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-glass-border bg-glass-strong shadow-[0_8px_22px_rgba(43,52,55,0.08)] backdrop-blur-xl"
                  style={
                    paidExpanded
                      ? {
                          // Claims real layout height so Por pagar compresses instead of being covered
                          flex: "0 0 min(40dvh, calc(100dvh - var(--fab-clearance) - 15rem))",
                          height: "min(40dvh, calc(100dvh - var(--fab-clearance) - 15rem))",
                        }
                      : { flex: "0 0 auto" }
                  }
                >
                  <button
                    type="button"
                    onClick={() => setPaidExpanded((open) => !open)}
                    className={`flex w-full shrink-0 items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-glass-soft ${
                      paidExpanded ? "border-b border-outline-variant/12" : ""
                    }`}
                    aria-expanded={paidExpanded}
                  >
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-on-surface-variant transition-transform duration-200 ${
                        paidExpanded ? "rotate-180" : ""
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium tracking-tight text-on-surface">
                        Pagados
                      </p>
                      <p className="mt-0.5 text-[11px] font-light text-on-surface-variant">
                        {paidItems.length}{" "}
                        {paidItems.length === 1 ? "gasto" : "gastos"}
                      </p>
                    </div>
                    <p className="shrink-0 text-[14px] font-light tabular-nums tracking-tight text-on-surface">
                      {formatCurrency(paidTotal)}
                    </p>
                  </button>

                  {paidExpanded ? (
                    <div
                      ref={paidScrollRef}
                      className="min-h-0 flex-1 overflow-y-auto overscroll-none no-scrollbar divide-y divide-outline-variant/12"
                    >
                      {paidItems.map(renderRow)}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </section>
      </main>

      <NumericKeypadSheet
        isOpen={Boolean(payTarget)}
        title={
          payTarget
            ? payEditing
              ? `Editar pago · ${payTarget.template.name}`
              : `Pagar ${payTarget.template.name}`
            : "Pagar"
        }
        subtitle={payEditing ? "Cambia el importe o la fecha" : "Valor real de este mes"}
        initialValue={payValue}
        errorMessage={payError}
        dateValue={payDate}
        onDateChange={setPayDate}
        dateLabel="Fecha de pago"
        onClose={() => {
          setPayTarget(null);
          setPayEditing(false);
        }}
        onValueChange={setPayValue}
        onConfirm={(value) => void confirmPay(value)}
      />

      <NumericKeypadSheet
        isOpen={depositOpen}
        title="Aportar al bolsillo"
        subtitle="Queda registrado en el historial, igual que en cualquier otro bolsillo."
        initialValue={depositValue}
        errorMessage={depositError}
        onClose={() => setDepositOpen(false)}
        onValueChange={setDepositValue}
        onConfirm={(value) => void confirmDeposit(value)}
      />

      <NumericKeypadSheet
        isOpen={formOpen && formBaseKeypadOpen}
        title="Valor base"
        subtitle="Previsión mensual de este gasto"
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
        <div className="fixed inset-0 z-[180] flex items-end justify-center bg-on-surface/40 backdrop-blur-sm sm:items-center">
          <div className="glass-sheet w-full max-w-md rounded-t-[2rem] border border-glass-border p-5 sm:rounded-[1.85rem]">
            <h3 className="text-lg font-medium tracking-tight text-on-surface">
              {editingId ? "Editar gasto fijo" : "Nuevo gasto fijo"}
            </h3>
            <p className="mt-1 text-sm font-light text-on-surface-variant">
              El valor base se usa como previsión del mes.
            </p>

            <form onSubmit={(e) => void submitForm(e)} className="mt-4 space-y-4">
              <Input
                label="Nombre"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Luz, agua, gimnasio…"
                required
              />
              <div className="space-y-2">
                <label
                  htmlFor="fixed-expense-base-value"
                  className="ml-1 block text-[11px] font-light text-on-surface-variant"
                >
                  Valor base
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
      ) : null}
    </div>
  );
}
