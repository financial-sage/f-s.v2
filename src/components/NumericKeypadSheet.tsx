"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, X } from "lucide-react";
import CustomNumpad from "@/components/CustomNumpad";
import type { AppCurrency } from "@/lib/currency";
import { DEFAULT_PERSONAL_FUND_COLOR } from "@/lib/funds";

interface NumericKeypadSheetProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  accentColor?: string;
  initialValue?: string;
  showDisplay?: boolean;
  errorMessage?: string;
  /** Optional YYYY-MM-DD payment / expense date row above the keypad */
  dateValue?: string;
  onDateChange?: (value: string) => void;
  dateLabel?: string;
  /** Override household currency for display (investments). */
  currency?: AppCurrency;
  /** Block confirm and show amount in red when the value exceeds this. */
  maxValue?: number;
  onClose: () => void;
  onValueChange: (value: string) => void;
  onConfirm: (value?: string) => void;
}

function formatSheetDate(value: string) {
  if (!value) return "Fecha";
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function NumericKeypadSheet({
  isOpen,
  title,
  subtitle,
  accentColor = DEFAULT_PERSONAL_FUND_COLOR,
  initialValue,
  showDisplay = true,
  errorMessage,
  dateValue,
  onDateChange,
  dateLabel = "Fecha de pago",
  currency,
  maxValue,
  onClose,
  onValueChange,
  onConfirm,
}: NumericKeypadSheetProps) {
  const [mounted, setMounted] = useState(false);
  const showDate = Boolean(dateValue != null && onDateChange);
  const displayDate = useMemo(
    () => (dateValue ? formatSheetDate(dateValue) : dateLabel),
    [dateValue, dateLabel]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[220]">
      <div className="absolute inset-0 bg-on-surface/45 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[221] overflow-hidden rounded-t-[2rem] border border-glass-border glass-sheet backdrop-blur-2xl animate-in slide-in-from-bottom-full duration-300">
        <div className="mx-auto flex w-full max-w-md flex-col">
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-outline-variant/35" />
          </div>

          <div className="relative flex items-start justify-between gap-3 px-5 pb-2 pt-1">
            <div className="min-w-0 flex-1 pr-8">
              {title ? (
                <h4 className="text-base font-medium tracking-tight text-on-surface">{title}</h4>
              ) : null}
              {subtitle ? (
                <div className="mt-1.5 inline-flex max-w-full items-center gap-2 rounded-full border border-glass-border bg-glass-soft px-2.5 py-1 shadow-sm backdrop-blur-md">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: accentColor }}
                    aria-hidden
                  />
                  <span
                    className="truncate text-sm font-semibold"
                    style={{ color: accentColor }}
                  >
                    {subtitle}
                  </span>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-1 flex h-9 w-9 items-center justify-center rounded-full border border-glass-border bg-glass-strong text-on-surface-variant shadow-sm backdrop-blur-md transition-colors hover:bg-glass-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>

          {showDate ? (
            <div className="relative px-5 pb-2">
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById(
                    "numeric-keypad-date"
                  ) as HTMLInputElement | null;
                  if (!input) return;
                  if (typeof input.showPicker === "function") {
                    input.showPicker();
                  } else {
                    input.click();
                  }
                }}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-2xl border border-glass-border bg-glass-soft px-3.5 py-2.5 text-left shadow-sm backdrop-blur-md"
              >
                <span className="text-[11px] font-light text-on-surface-variant">{dateLabel}</span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <CalendarDays size={14} className="shrink-0 text-outline-variant" />
                  <span className="truncate text-sm font-medium capitalize text-on-surface">
                    {displayDate}
                  </span>
                </span>
              </button>
              <input
                id="numeric-keypad-date"
                type="date"
                value={dateValue ?? ""}
                onChange={(e) => onDateChange?.(e.target.value)}
                className="pointer-events-none absolute h-0 w-0 opacity-0"
                tabIndex={-1}
              />
            </div>
          ) : null}

          {errorMessage ? (
            <div className="px-5 pb-2">
              <p className="alert-error rounded-2xl px-4 py-3 text-center text-sm font-medium shadow-sm">
                {errorMessage}
              </p>
            </div>
          ) : null}

          <CustomNumpad
            isOpen={isOpen}
            embedded
            embeddedStyle="flat"
            showDisplay={showDisplay}
            accentColor={accentColor}
            currency={currency}
            initialValue={initialValue || "0"}
            maxValue={maxValue}
            onClose={onClose}
            onValueChange={onValueChange}
            onConfirm={onConfirm}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
