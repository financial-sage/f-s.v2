"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { FormattedCurrency } from "@/components/FormattedCurrency";
import { useExpenseModal } from "@/components/ExpenseModalProvider";
import { Portal } from "@/components/ui/Portal";
import {
  readMonthEnvelopePlan,
  resolveDefaultAccountIdForCategory,
} from "@/lib/budgetEnvelopes";
import { getMonthKey } from "@/lib/budget";
import { formatDueDayShort } from "@/lib/dashboardMonthSignal";
import type { UpcomingWeeklyPayment } from "@/lib/budgetHelpers";
import { useExpenseStore } from "@/store/useExpenseStore";

const MAX_WEEK_VISIBLE = 3;

type UpcomingPaymentsCardProps = {
  payments: UpcomingWeeklyPayment[];
  className?: string;
};

function PaymentRow({
  payment,
  onPay,
}: {
  payment: UpcomingWeeklyPayment;
  onPay: (payment: UpcomingWeeklyPayment) => void;
}) {
  const paid = payment.status === "Pagado";
  const isToday = payment.daysUntil === 0;
  const dueLabel = formatDueDayShort(payment.dueDay);
  const dayLabel = isToday ? "Hoy" : dueLabel;

  const rowClass = paid
    ? "opacity-55"
    : isToday
      ? "bg-amber-500/[0.1]"
      : "";
  const accentClass = paid
    ? "font-light text-on-surface-variant/70"
    : isToday
      ? "font-medium text-amber-800/85 dark:text-amber-100/90"
      : "font-light text-on-surface-variant";
  const nameClass = paid
    ? "font-light text-on-surface-variant line-through"
    : isToday
      ? "font-medium text-on-surface"
      : "font-light text-on-surface";
  const amountClass = paid
    ? "text-on-surface-variant/55 line-through"
    : isToday
      ? "text-amber-800/85 dark:text-amber-100/90"
      : "text-on-surface-variant";

  return (
    <li>
      {paid ? (
        <div
          className={`flex w-full min-w-0 items-center gap-1.5 px-3 py-2 ${rowClass}`}
        >
          <span
            className={`w-[3.5rem] shrink-0 text-[11px] tabular-nums ${accentClass}`}
          >
            {dayLabel}
          </span>
          <span className={`min-w-0 flex-1 truncate text-[12px] ${nameClass}`}>
            {payment.name}
          </span>
          <span
            className={`shrink-0 text-[11px] font-medium tabular-nums ${amountClass}`}
          >
            {payment.amount > 0 ? (
              <FormattedCurrency value={payment.amount} />
            ) : (
              "—"
            )}
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onPay(payment)}
          className={`flex w-full min-w-0 items-center gap-1.5 px-3 py-2 text-left transition-colors active:scale-[0.99] ${
            isToday
              ? "bg-amber-500/[0.1] hover:bg-amber-500/[0.14]"
              : "hover:bg-on-surface/[0.03]"
          }`}
        >
          <span
            className={`w-[3.5rem] shrink-0 text-[11px] tabular-nums ${accentClass}`}
          >
            {dayLabel}
          </span>
          <span className={`min-w-0 flex-1 truncate text-[12px] ${nameClass}`}>
            {payment.name}
          </span>
          <span
            className={`shrink-0 text-[11px] font-medium tabular-nums ${amountClass}`}
          >
            {payment.amount > 0 ? (
              <FormattedCurrency value={payment.amount} />
            ) : (
              "—"
            )}
          </span>
          <span className="shrink-0 rounded-full border border-primary/20 bg-primary/[0.08] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.03em] text-primary">
            Pagar
          </span>
        </button>
      )}
    </li>
  );
}

/**
 * Week-ahead dues — same surface language as DashboardMonthSignal.
 * Tap opens SimpleExpenseSheet prefilled for that payment.
 */
export function UpcomingPaymentsCard({
  payments,
  className,
}: UpcomingPaymentsCardProps) {
  const familyId = useExpenseStore((s) => s.familyId);
  const {
    setExpenseDraft,
    setExpenseToEdit,
    setIsExpenseModalOpen,
  } = useExpenseModal();

  const [expanded, setExpanded] = useState(false);
  const weekSectionRef = useRef<HTMLDivElement | null>(null);
  const [overlayBox, setOverlayBox] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const pendingCount = useMemo(
    () => payments.filter((p) => p.status === "Pendiente").length,
    [payments],
  );
  const visibleItems = useMemo(
    () => payments.slice(0, MAX_WEEK_VISIBLE),
    [payments],
  );
  const hiddenCount = Math.max(0, payments.length - MAX_WEEK_VISIBLE);
  const canExpand = hiddenCount > 0;

  function openPaymentExpense(payment: UpcomingWeeklyPayment) {
    setExpanded(false);
    const plan =
      familyId != null
        ? readMonthEnvelopePlan(familyId, getMonthKey())
        : null;
    const paidAccountId = resolveDefaultAccountIdForCategory(plan, {
      categoryId: payment.id,
      categoryName: payment.name,
    });

    setExpenseToEdit(null);
    setExpenseDraft({
      amount: payment.amount > 0 ? payment.amount : undefined,
      concept: payment.name,
      categoryId: payment.id,
      categoryName: payment.name,
      paidAccountId,
      // Confirm first — keypad only if the user taps the amount to edit.
      initialStep: payment.amount > 0 ? 3 : 1,
    });
    setIsExpenseModalOpen(true);
  }

  useLayoutEffect(() => {
    if (!expanded) {
      setOverlayBox(null);
      return;
    }
    const el = weekSectionRef.current;
    if (!el) return;

    const sync = () => {
      const rect = el.getBoundingClientRect();
      setOverlayBox({
        top: rect.top,
        left: rect.left,
        width: rect.width,
      });
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  return (
    <div
      data-tour="upcoming-payments"
      className={`relative overflow-hidden rounded-xl border border-outline-variant/20 bg-glass-soft/70 shadow-[0_4px_16px_rgba(43,52,55,0.06)] backdrop-blur-md ${className ?? ""}`}
    >
      <div className="flex min-w-0 items-center gap-2.5 px-3 py-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-on-surface/[0.04] text-on-surface-variant">
          <CalendarDays size={16} strokeWidth={1.6} aria-hidden />
        </div>
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <p className="text-[10px] font-light uppercase tracking-[0.06em] text-on-surface-variant">
            Esta semana
          </p>
          <p className="ml-auto flex shrink-0 items-baseline gap-1.5 tabular-nums">
            <span className="text-[1.15rem] font-medium leading-none tracking-tight text-on-surface">
              {pendingCount}
            </span>
            <span className="text-[12px] font-light text-on-surface-variant">
              {pendingCount === 1 ? "pago pendiente" : "pagos pendientes"}
            </span>
          </p>
        </div>
      </div>

      <div
        ref={weekSectionRef}
        className="relative border-t border-outline-variant/15"
      >
        <p className="px-3 pt-2 text-[10px] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
          Vencimientos
        </p>
        {payments.length > 0 ? (
          <>
            <ul className={canExpand ? "pb-0" : "pb-1"}>
              {visibleItems.map((payment) => (
                <PaymentRow
                  key={payment.id}
                  payment={payment}
                  onPay={openPaymentExpense}
                />
              ))}
            </ul>
            {canExpand ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full px-3 py-2 text-left text-[11px] font-medium text-on-surface-variant transition-colors hover:text-on-surface"
              >
                Ver {hiddenCount} más
              </button>
            ) : null}
          </>
        ) : (
          <p className="px-3 pb-2.5 pt-1 text-[12px] font-light leading-snug text-on-surface-variant">
            Sin compromisos de pago esta semana. Respira, el mes sigue a buen
            ritmo.
          </p>
        )}
      </div>

      {expanded && canExpand && overlayBox ? (
        <Portal>
          <button
            type="button"
            aria-label="Cerrar lista"
            className="fixed inset-0 z-[90] cursor-default bg-transparent"
            onClick={() => setExpanded(false)}
          />
          <div
            className="fixed z-[91] overflow-hidden rounded-xl border border-outline-variant/20 bg-glass-soft/95 shadow-[0_12px_32px_rgba(43,52,55,0.14)] backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-200"
            style={{
              top: overlayBox.top,
              left: overlayBox.left,
              width: overlayBox.width,
            }}
            role="dialog"
            aria-label="Vencimientos de esta semana"
          >
            <p className="px-3 pt-2 text-[10px] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
              Vencimientos
            </p>
            <ul className="max-h-[42vh] overflow-y-auto overscroll-contain pb-1">
              {payments.map((payment) => (
                <PaymentRow
                  key={`expanded-${payment.id}`}
                  payment={payment}
                  onPay={openPaymentExpense}
                />
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="w-full border-t border-outline-variant/15 px-3 py-2.5 text-left text-[11px] font-medium text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Cerrar
            </button>
          </div>
        </Portal>
      ) : null}
    </div>
  );
}
