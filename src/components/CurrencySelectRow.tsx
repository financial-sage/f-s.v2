"use client";

import { Check, Coins } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CurrencyFlag } from "@/components/CurrencyFlag";
import { useCurrency } from "@/hooks/useCurrency";
import { CURRENCY_OPTIONS, type AppCurrency } from "@/lib/currency";

export function CurrencySelectRow() {
  const { currency, setCurrency, meta } = useCurrency();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function select(code: AppCurrency) {
    setCurrency(code);
    setOpen(false);
  }

  return (
    <>
      <button
        ref={rowRef}
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-glass-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-glass-strong text-primary shadow-sm">
            <Coins size={16} />
          </div>
          <span className="text-sm font-medium text-on-surface">Moneda</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-medium text-on-surface-variant">
          <CurrencyFlag code={meta.code} size="sm" />
          <span className="tabular-nums">{meta.symbol}</span>
        </div>
      </button>

      {mounted && open
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-[200] bg-on-surface/40 backdrop-blur-[2px]"
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Elegir moneda"
                className="fixed inset-x-0 bottom-0 z-[210] mx-auto w-full max-w-md rounded-t-[1.75rem] border border-glass-border bg-glass-strong p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(43,52,55,0.18)] backdrop-blur-xl"
              >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-outline-variant/40" />
                <p className="mb-3 px-1 text-[11px] font-light text-on-surface-variant">
                  Formato de moneda
                </p>
                <ul className="space-y-1.5">
                  {CURRENCY_OPTIONS.map((option) => {
                    const selected = option.code === currency;
                    return (
                      <li key={option.code}>
                        <button
                          type="button"
                          onClick={() => select(option.code)}
                          className={`flex w-full items-center justify-between rounded-2xl px-3.5 py-3 text-left transition ${
                            selected
                              ? "bg-primary/10 text-on-surface"
                              : "bg-glass text-on-surface hover:bg-glass-strong"
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <CurrencyFlag code={option.code} size="md" />
                            <span>
                              <span className="block text-sm font-medium">
                                {option.label}
                              </span>
                              <span className="block text-xs font-light text-on-surface-variant">
                                {option.code} · {option.symbol}
                              </span>
                            </span>
                          </span>
                          {selected ? (
                            <Check size={16} className="text-primary" aria-hidden />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
