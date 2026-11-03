"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, ChevronRight } from "lucide-react";
import { FormattedCurrency } from "@/components/FormattedCurrency";
import { Portal } from "@/components/ui/Portal";
import { loadFixedExpensesMonthAction } from "@/app/actions/fixedExpenses";
import { getMonthKey } from "@/lib/budget";
import {
  daysRemainingInMonth,
  formatDueDayShort,
  listPendingFixedThisWeek,
  MAX_WEEK_VISIBLE,
  type WeekPendingFixed,
} from "@/lib/dashboardMonthSignal";

type Props = {
  /** When false, hide numeric amounts (same as hero eye). */
  amountsVisible?: boolean;
  className?: string;
};

function WeekItemRow({
  item,
  amountsVisible,
}: {
  item: WeekPendingFixed;
  amountsVisible: boolean;
}) {
  const dueLabel = formatDueDayShort(item.dueDay);
  const dayLabel = item.isToday
    ? "Hoy"
    : item.isOverdue
      ? "Vencido"
      : dueLabel;
  const rowClass = item.isToday
    ? "bg-amber-500/[0.1] hover:bg-amber-500/[0.14]"
    : item.isOverdue
      ? "bg-on-surface/[0.035] hover:bg-on-surface/[0.05]"
      : "hover:bg-on-surface/[0.03]";
  const accentClass = item.isToday
    ? "font-medium text-amber-800/85 dark:text-amber-100/90"
    : item.isOverdue
      ? "font-medium text-on-surface-variant"
      : "font-light text-on-surface-variant";
  const nameClass =
    item.isToday || item.isOverdue
      ? "font-medium text-on-surface"
      : "font-light text-on-surface";
  const amountClass = item.isToday
    ? "text-amber-800/85 dark:text-amber-100/90"
    : item.isOverdue
      ? "text-on-surface"
      : "text-on-surface-variant";

  return (
    <li>
      <Link
        href="/fixed-expenses"
        className={`flex min-w-0 items-center gap-1.5 px-3 py-2 text-left transition-colors ${rowClass}`}
      >
        <span
          className={`w-[3.5rem] shrink-0 text-[11px] tabular-nums ${accentClass}`}
          title={item.isOverdue ? dueLabel : undefined}
        >
          {dayLabel}
        </span>
        <span className={`min-w-0 flex-1 truncate text-[12px] ${nameClass}`}>
          {item.name}
        </span>
        <span
          className={`shrink-0 text-[11px] font-medium tabular-nums ${amountClass}`}
        >
          {amountsVisible ? <FormattedCurrency value={item.amount} /> : "••••"}
        </span>
        <ChevronRight
          size={12}
          strokeWidth={1.75}
          className="shrink-0 text-on-surface-variant/60"
        />
      </Link>
    </li>
  );
}

/**
 * Month cue under dash-modules: days left + pending fixed due this week.
 */
export default function DashboardMonthSignal({
  amountsVisible = true,
  className,
}: Props) {
  const [weekItems, setWeekItems] = useState<WeekPendingFixed[]>([]);
  const [weekLoaded, setWeekLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const weekSectionRef = useRef<HTMLDivElement | null>(null);
  const [overlayBox, setOverlayBox] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const daysLeft = useMemo(() => daysRemainingInMonth(), []);
  const dayLabel = daysLeft === 1 ? "día" : "días";

  const visibleItems = useMemo(
    () => weekItems.slice(0, MAX_WEEK_VISIBLE),
    [weekItems]
  );
  const hiddenCount = Math.max(0, weekItems.length - MAX_WEEK_VISIBLE);
  const canExpand = hiddenCount > 0;

  useEffect(() => {
    let cancelled = false;
    const monthKey = getMonthKey();
    void loadFixedExpensesMonthAction(monthKey)
      .then((snap) => {
        if (cancelled) return;
        setWeekItems(listPendingFixedThisWeek(snap.items ?? []));
        setWeekLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setWeekItems([]);
          setWeekLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      data-tour="dash-month-signal"
      className={`relative mt-1.5 overflow-hidden rounded-xl bg-glass-soft/70 shadow-[0_4px_16px_rgba(43,52,55,0.06)] backdrop-blur-md ${className ?? ""}`}
    >
      <div className="flex min-w-0 items-center gap-3 px-3 py-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-on-surface/[0.04] text-on-surface-variant">
          <CalendarClock size={18} strokeWidth={1.6} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-light uppercase tracking-[0.06em] text-on-surface-variant">
            Este mes
          </p>
          <p className="mt-0.5 flex min-w-0 items-baseline gap-1.5">
            <span className="text-[1.15rem] font-medium leading-none tracking-tight tabular-nums text-on-surface">
              {daysLeft}
            </span>
            <span className="truncate text-[12px] font-light text-on-surface-variant">
              {dayLabel} restantes
            </span>
          </p>
        </div>
      </div>

      {weekLoaded ? (
        <div
          ref={weekSectionRef}
          className="relative border-t border-outline-variant/15"
        >
          <p className="px-3 pt-2 text-[10px] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
            Esta semana
          </p>
          {weekItems.length > 0 ? (
            <>
              <ul className={canExpand ? "pb-0" : "pb-1"}>
                {visibleItems.map((item) => (
                  <WeekItemRow
                    key={`${item.name}-${item.dueDay}`}
                    item={item}
                    amountsVisible={amountsVisible}
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
      ) : null}

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
            aria-label="Compromisos de esta semana"
          >
            <p className="px-3 pt-2 text-[10px] font-medium uppercase tracking-[0.05em] text-on-surface-variant">
              Esta semana
            </p>
            <ul className="max-h-[42vh] overflow-y-auto overscroll-contain pb-1">
              {weekItems.map((item) => (
                <WeekItemRow
                  key={`expanded-${item.name}-${item.dueDay}`}
                  item={item}
                  amountsVisible={amountsVisible}
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
