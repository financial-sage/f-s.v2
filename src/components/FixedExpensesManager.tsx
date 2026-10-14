"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Plus,
  SquarePen,
} from "lucide-react";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { useCurrency } from "@/hooks/useCurrency";
import { useFixedExpenses } from "@/hooks/useFixedExpenses";
import {
  formatMonthLabel,
  getMonthKey,
  shiftMonthKey,
} from "@/lib/budget";
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

  const checklist = useMemo(() => {
    const pending = items.filter((item) => item.payment.status === "pending");
    const paid = items.filter((item) => item.payment.status === "paid");
    return [...pending, ...paid];
  }, [items]);

  // Progress fills as real payments accumulate against the sum of bases.
  const ratio = progressRatio(totals.sumReal, totals.sumBase);
  const remainingToPay = useMemo(
    () =>
      Math.round(
        items
          .filter((item) => item.payment.status === "pending")
          .reduce((sum, item) => sum + Number(item.payment.base_value_snapshot || 0), 0) * 100
      ) / 100,
    [items]
  );

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
      item.payment.paid_at?.slice(0, 10) && /^\d{4}-\d{2}-\d{2}$/.test(item.payment.paid_at.slice(0, 10))
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

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-page-gradient text-on-surface">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56"
        style={{
          backgroundImage: `radial-gradient(ellipse at bottom, ${ACCENT}2E, transparent 70%)`,
        }}
      />

      <header className="relative z-50 flex w-full shrink-0 items-center justify-between px-4 pb-1.5 pt-3">
        <Link
          href="/"
          className="rounded-full border border-glass-border bg-glass-strong p-2 text-on-surface-variant shadow-sm backdrop-blur-sm"
          aria-label="Volver al inicio"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="min-w-0 text-center">
          <p className="text-[11px] font-light text-on-surface-variant">Checklist del mes</p>
          <h1 className="truncate text-[15px] font-medium tracking-tight text-on-surface">
            Gastos fijos
          </h1>
        </div>
        <div className="h-9 w-9" aria-hidden />
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 min-h-0 flex-col overflow-hidden px-4 pt-1">
        <section className="mb-3 shrink-0">
          <div
            className="relative overflow-hidden rounded-[1.85rem] border border-glass-border p-5 shadow-[0_14px_40px_rgba(43,52,55,0.12)] backdrop-blur-2xl"
            style={{
              backgroundImage: tintedGlassGradient(ACCENT, {
                soft: true,
                midAlpha: "28",
                endAlpha: "3D",
                midStop: 52,
              }),
            }}
          >
            <div className="relative z-10 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setMonthKey((key) => shiftMonthKey(key, -1))}
                className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-glass-soft"
                aria-label="Mes anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <p className="text-[11px] font-light text-on-surface-variant">
                {formatMonthLabel(monthKey)}
              </p>
              <button
                type="button"
                onClick={() => setMonthKey((key) => shiftMonthKey(key, 1))}
                className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-glass-soft"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="relative z-10 mt-4 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-light text-on-surface-variant">
                  Bolsillo · {totals.paidCount}/{totals.totalCount} pagados
                </p>
                <p className="mt-1 text-[2.65rem] font-light leading-none tracking-tight text-on-surface">
                  {formatCurrency(totals.pocketBalance)}
                </p>
              </div>
              <button
                type="button"
                onClick={openDepositEditor}
                className="shrink-0 rounded-full bg-glass-soft px-3 py-1.5 text-xs font-medium text-on-surface backdrop-blur-sm transition-colors hover:bg-glass-strong"
              >
                Aportar
              </button>
            </div>

            <div className="relative z-10 mt-5">
              <div className="h-1.5 overflow-hidden rounded-full bg-glass-soft">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${ratio * 100}%`,
                    backgroundImage: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}B8)`,
                  }}
                />
              </div>
              <div className="mt-2.5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-light tracking-tight text-on-surface tabular-nums">
                    {formatCurrency(totals.sumReal)}
                  </p>
                  <p className="mt-0.5 text-[10px] font-light text-on-surface-variant">Pagado</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-light tracking-tight text-on-surface tabular-nums">
                    {formatCurrency(remainingToPay)}
                  </p>
                  <p className="mt-0.5 text-[10px] font-light text-on-surface-variant">Falta</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="alert-error mb-3 shrink-0 rounded-2xl px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <section className="min-h-0 flex-1 overflow-y-auto overscroll-none pb-28 no-scrollbar">
          <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
            <h2 className="text-xs font-medium text-on-surface">Este mes</h2>
            <p className="text-xs font-light tabular-nums text-on-surface-variant">
              {formatCurrency(totals.sumBase)}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm font-light text-on-surface-variant">
              <LoaderCircle size={16} className="animate-spin" />
              Cargando…
            </div>
          ) : checklist.length === 0 ? (
            <button
              type="button"
              onClick={openCreateForm}
              className="flex w-full flex-col items-center gap-2 rounded-[1.85rem] border border-dashed bg-glass-soft px-4 py-10 text-center shadow-sm backdrop-blur-md"
              style={{ borderColor: `${ACCENT}40` }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: `${ACCENT}1A`, color: ACCENT }}
              >
                <Plus size={18} />
              </span>
              <span className="text-sm font-medium text-on-surface">Añade tu primer gasto fijo</span>
              <span className="max-w-[220px] text-xs font-light text-on-surface-variant">
                Luz, agua, gimnasio… y ve tachándolos cada mes.
              </span>
            </button>
          ) : (
            <div className="rounded-[1.5rem] border border-glass-border bg-glass-strong shadow-[0_12px_28px_rgba(43,52,55,0.10)] backdrop-blur-xl">
              {checklist.map((item, index) => {
                const isPaid = item.payment.status === "paid";
                const baseAmount = Number(item.payment.base_value_snapshot || 0);
                const realAmount = Number(item.payment.real_value ?? 0);
                const rowAmount = isPaid ? realAmount : baseAmount;
                const variance = isPaid ? realAmount - baseAmount : 0;
                const isFirst = index === 0;
                const isLast = index === checklist.length - 1;

                return (
                  <div
                    key={item.payment.id}
                    className={`relative flex items-center gap-2.5 px-3 py-2 ${
                      index > 0 ? "border-t border-outline-variant/15" : ""
                    } ${isPaid ? "bg-glass-muted" : ""} ${
                      isFirst ? "rounded-t-[1.5rem]" : ""
                    } ${isLast ? "rounded-b-[1.5rem]" : ""}`}
                  >
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        if (isPaid) {
                          void unmarkPaid(item.payment.id);
                          return;
                        }
                        openPay(item);
                      }}
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all active:scale-95 ${
                        isPaid
                          ? "text-white shadow-sm"
                          : "border-outline-variant/45 bg-glass-strong text-transparent"
                      }`}
                      style={
                        isPaid
                          ? { backgroundColor: ACCENT, borderColor: `${ACCENT}66` }
                          : undefined
                      }
                      aria-label={isPaid ? "Deshacer pago" : `Pagar ${item.template.name}`}
                    >
                      {isPaid ? <Check size={10} strokeWidth={2.75} /> : null}
                    </button>

                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        if (isPaid) {
                          openEditPay(item);
                          return;
                        }
                        openPay(item);
                      }}
                    >
                      <p
                        className={`truncate text-[13px] font-medium tracking-tight ${
                          isPaid ? "text-on-surface-variant line-through decoration-outline-variant/50" : "text-on-surface"
                        }`}
                      >
                        {item.template.name}
                      </p>
                      {isPaid && formatPaidDate(item.payment.paid_at) ? (
                        <p className="mt-0.5 text-[10px] font-light capitalize text-on-surface-variant">
                          Pagado · {formatPaidDate(item.payment.paid_at)} · Editar
                        </p>
                      ) : null}
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                      {isPaid && variance > 0 ? (
                        <ArrowUp
                          size={12}
                          strokeWidth={2.5}
                          className="text-red-600"
                          aria-label="Pagado por encima de la base"
                        />
                      ) : null}
                      {isPaid && variance < 0 ? (
                        <ArrowDown
                          size={12}
                          strokeWidth={2.5}
                          className="text-emerald-600"
                          aria-label="Pagado por debajo de la base"
                        />
                      ) : null}
                      {isPaid && variance === 0 ? (
                        <span
                          className="text-[12px] font-semibold leading-none text-on-surface"
                          aria-label="Pagado igual a la base"
                        >
                          =
                        </span>
                      ) : null}
                      <span
                        className={`text-[13px] font-light tabular-nums tracking-tight ${
                          isPaid ? "text-on-surface-variant" : "text-on-surface"
                        }`}
                      >
                        {formatCurrency(rowAmount)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditForm(item)}
                      className="shrink-0 rounded-full p-1 text-outline-variant transition-colors hover:bg-glass-strong hover:text-on-surface-variant"
                      aria-label={`Editar ${item.template.name}`}
                    >
                      <SquarePen size={14} strokeWidth={2} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <button
        type="button"
        onClick={openCreateForm}
        className="fixed bottom-6 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-glass-border text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-transform active:scale-95"
        style={{
          backgroundImage: `linear-gradient(145deg, #6B8296 0%, ${ACCENT} 48%, #3A4D5C 100%)`,
        }}
        aria-label="Agregar gasto fijo"
      >
        <Plus size={18} strokeWidth={2.2} />
      </button>

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
        subtitle="Queda registrado en el historial, igual que en cualquier otro fondo."
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
          <div className="w-full max-w-md rounded-t-[2rem] border border-glass-border glass-sheet p-5 backdrop-blur-xl sm:rounded-[1.85rem]">
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
                <div className="alert-error rounded-2xl px-4 py-3 text-sm">
                  {formError}
                </div>
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
