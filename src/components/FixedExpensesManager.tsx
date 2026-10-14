"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MoreVertical,
  Plus,
  RotateCcw,
} from "lucide-react";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { useFixedExpenses } from "@/hooks/useFixedExpenses";
import {
  formatCurrency,
  formatMonthLabel,
  getMonthKey,
  shiftMonthKey,
} from "@/lib/budget";
import type { FixedExpenseMonthItem } from "@/lib/fixed-expenses/types";
import { FIXED_EXPENSES_FUND_COLOR } from "@/lib/funds";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const ACCENT = FIXED_EXPENSES_FUND_COLOR;
const ROW_MENU_WIDTH = 160;
const ROW_MENU_EST_HEIGHT = 96;

type RowMenuState = {
  id: string;
  top: number;
  bottom: number;
  right: number;
};

function progressRatio(spent: number, budget: number) {
  if (budget <= 0) return 0;
  return Math.min(1, spent / budget);
}

export default function FixedExpensesManager() {
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
    unmarkPaid,
  } = useFixedExpenses(monthKey);

  const [payTarget, setPayTarget] = useState<FixedExpenseMonthItem | null>(null);
  const [payValue, setPayValue] = useState("0");
  const [payError, setPayError] = useState("");

  const [depositOpen, setDepositOpen] = useState(false);
  const [depositValue, setDepositValue] = useState("0");
  const [depositError, setDepositError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formBase, setFormBase] = useState("");
  const [formError, setFormError] = useState("");
  const [rowMenu, setRowMenu] = useState<RowMenuState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    setRowMenu(null);
    setPayTarget(item);
    setPayValue(String(item.payment.base_value_snapshot || 0));
    setPayError("");
  }

  async function confirmPay(value?: string) {
    if (!payTarget) return;
    const amount = Number((value ?? payValue).replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError("Ingresa un valor real válido.");
      return;
    }
    try {
      await markPaid(payTarget.payment.id, amount);
      setPayTarget(null);
      setPayError("");
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "No se pudo registrar el pago.");
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
    setFormBase("");
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(item: FixedExpenseMonthItem) {
    setRowMenu(null);
    setEditingId(item.template.id);
    setFormName(item.template.name);
    setFormBase(String(item.template.base_value));
    setFormError("");
    setFormOpen(true);
  }

  function openRowMenu(id: string, button: HTMLButtonElement) {
    const rect = button.getBoundingClientRect();
    setRowMenu((prev) =>
      prev?.id === id
        ? null
        : { id, top: rect.top, bottom: rect.bottom, right: rect.right }
    );
  }

  const rowMenuItem = rowMenu
    ? checklist.find((item) => item.payment.id === rowMenu.id) ?? null
    : null;

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
    <div
      className="relative flex h-dvh flex-col overflow-hidden text-on-surface"
      style={{
        backgroundImage: `linear-gradient(180deg, #eef2f5 0%, #e2e8ee 48%, #d4dde6 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56"
        style={{
          backgroundImage: `radial-gradient(ellipse at bottom, ${ACCENT}2E, transparent 70%)`,
        }}
      />

      <header className="relative z-50 flex w-full shrink-0 items-center justify-between px-4 pb-1.5 pt-3">
        <Link
          href="/profile"
          className="rounded-full border border-white/50 bg-white/70 p-2 text-on-surface-variant shadow-sm backdrop-blur-sm"
          aria-label="Volver"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="min-w-0 text-center">
          <p className="text-[11px] font-light text-on-surface-variant">Checklist del mes</p>
          <h1 className="truncate text-[15px] font-medium tracking-tight text-on-surface">
            Gastos fijos
          </h1>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="rounded-full border border-white/50 bg-white/70 p-2 shadow-sm backdrop-blur-sm"
          style={{ color: ACCENT }}
          aria-label="Agregar gasto fijo"
        >
          <Plus size={18} />
        </button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 min-h-0 flex-col overflow-hidden px-4 pt-1">
        <section className="mb-3 shrink-0">
          <div
            className="relative overflow-hidden rounded-[1.85rem] border border-white/45 p-5 shadow-[0_14px_40px_rgba(43,52,55,0.12)] backdrop-blur-2xl"
            style={{
              backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.55) 0%, ${ACCENT}28 52%, ${ACCENT}3D 100%)`,
            }}
          >
            <div className="relative z-10 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setMonthKey((key) => shiftMonthKey(key, -1))}
                className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-white/40"
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
                className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-white/40"
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
                className="shrink-0 rounded-full bg-white/45 px-3 py-1.5 text-xs font-medium text-on-surface backdrop-blur-sm transition-colors hover:bg-white/65"
              >
                Aportar
              </button>
            </div>

            <div className="relative z-10 mt-5">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/45">
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
          <div className="mb-3 shrink-0 rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm text-red-700">
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
              className="flex w-full flex-col items-center gap-2 rounded-[1.85rem] border border-dashed bg-white/40 px-4 py-10 text-center shadow-sm backdrop-blur-md"
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
            <div className="rounded-[1.5rem] border border-white/60 bg-white/70 shadow-[0_12px_28px_rgba(43,52,55,0.10)] backdrop-blur-xl">
              {checklist.map((item, index) => {
                const isPaid = item.payment.status === "paid";
                const rowAmount = isPaid
                  ? Number(item.payment.real_value ?? 0)
                  : Number(item.payment.base_value_snapshot || 0);
                const isFirst = index === 0;
                const isLast = index === checklist.length - 1;

                return (
                  <div
                    key={item.payment.id}
                    className={`relative flex items-center gap-2.5 px-3 py-2 ${
                      index > 0 ? "border-t border-outline-variant/15" : ""
                    } ${isPaid ? "bg-white/25" : ""} ${
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
                          : "border-outline-variant/45 bg-white/70 text-transparent"
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
                        if (isPaid) return;
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
                    </button>

                    <span
                      className={`shrink-0 text-[13px] font-light tabular-nums tracking-tight ${
                        isPaid ? "text-on-surface-variant" : "text-on-surface"
                      }`}
                    >
                      {formatCurrency(rowAmount)}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => openRowMenu(item.payment.id, e.currentTarget)}
                      className="shrink-0 rounded-full p-1 text-outline-variant transition-colors hover:bg-white/60 hover:text-on-surface-variant"
                      aria-label="Más opciones"
                      aria-expanded={rowMenu?.id === item.payment.id}
                    >
                      <MoreVertical size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {mounted &&
        rowMenu &&
        rowMenuItem &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[190]"
              aria-label="Cerrar menú"
              onClick={() => setRowMenu(null)}
            />
            <div
              role="menu"
              className="fixed z-[200] overflow-hidden rounded-2xl border border-white/50 bg-white py-1 shadow-[0_12px_28px_rgba(43,52,55,0.18)]"
              style={(() => {
                const openUp =
                  window.innerHeight - rowMenu.bottom < ROW_MENU_EST_HEIGHT + 12;
                const right = Math.max(8, window.innerWidth - rowMenu.right);
                if (openUp) {
                  return {
                    width: ROW_MENU_WIDTH,
                    right,
                    bottom: window.innerHeight - rowMenu.top + 4,
                  };
                }
                return {
                  width: ROW_MENU_WIDTH,
                  right,
                  top: rowMenu.bottom + 4,
                };
              })()}
            >
              {rowMenuItem.payment.status !== "paid" ? (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full px-3 py-2.5 text-left text-sm text-on-surface hover:bg-surface-low"
                  onClick={() => openPay(rowMenuItem)}
                >
                  Registrar pago
                </button>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-on-surface hover:bg-surface-low"
                  onClick={() => {
                    setRowMenu(null);
                    void unmarkPaid(rowMenuItem.payment.id);
                  }}
                >
                  <RotateCcw size={14} />
                  Deshacer
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                className="flex w-full px-3 py-2.5 text-left text-sm text-on-surface hover:bg-surface-low"
                onClick={() => openEditForm(rowMenuItem)}
              >
                Editar
              </button>
            </div>
          </>,
          document.body
        )}

      <NumericKeypadSheet
        isOpen={Boolean(payTarget)}
        title={payTarget ? `Pagar ${payTarget.template.name}` : "Pagar"}
        subtitle="Valor real de este mes"
        initialValue={payValue}
        errorMessage={payError}
        onClose={() => setPayTarget(null)}
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

      {formOpen ? (
        <div className="fixed inset-0 z-[180] flex items-end justify-center bg-on-surface/40 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-t-[2rem] border border-white/50 bg-white/90 p-5 shadow-2xl backdrop-blur-xl sm:rounded-[1.85rem]">
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
              <Input
                label="Valor base"
                value={formBase}
                onChange={(e) => setFormBase(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="0.00"
                inputMode="decimal"
                required
              />

              {formError ? (
                <div className="rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm text-red-700">
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
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setFormOpen(false)}>
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
