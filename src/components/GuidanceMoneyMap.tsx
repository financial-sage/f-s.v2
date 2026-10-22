"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { FormattedCurrency } from "@/components/FormattedCurrency";

export type MoneyMapPocket = {
  name: string;
  balance: number;
};

type Props = {
  hasVisibleAccounts: boolean;
  accountsVisibleLiquidity: number;
  pockets: MoneyMapPocket[];
  pocketsTotal: number;
  monthSpent: number;
};

/** Copper, a touch deeper than brand accent — calm attention, not alarm. */
const strainedAmountClass =
  "text-[color-mix(in_srgb,var(--accent)_42%,#6b4423)]";

export default function GuidanceMoneyMap({
  hasVisibleAccounts,
  accountsVisibleLiquidity,
  pockets,
  pocketsTotal,
  monthSpent,
}: Props) {
  const [open, setOpen] = useState(false);
  const negativeCount = pockets.filter((p) => p.balance < 0).length;
  const accountEmpty = hasVisibleAccounts && accountsVisibleLiquidity === 0;
  const accountStrained = hasVisibleAccounts && accountsVisibleLiquidity < 0;

  return (
    <section className="overflow-hidden rounded-[1.85rem] border border-glass-border bg-surface-lowest/90 shadow-[0_12px_28px_rgba(43,52,55,0.06)] backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors duration-200 hover:bg-on-surface/[0.03]"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-light tracking-[0.14em] text-on-surface-variant/80">
            Transparencia
          </span>
          <span className="mt-1 block text-[15px] font-light tracking-tight text-on-surface">
            Revisa dónde está tu dinero
          </span>
          {negativeCount > 0 ? (
            <span
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                open
                  ? "grid-rows-[0fr] opacity-0"
                  : "grid-rows-[1fr] opacity-100"
              }`}
              aria-hidden={open}
            >
              <span className={`overflow-hidden pt-1 text-[12px] font-light ${strainedAmountClass}`}>
                {negativeCount === 1
                  ? "1 bolsillo bajo cero"
                  : `${negativeCount} bolsillos bajo cero`}
                {accountEmpty ? " · cuenta en 0" : ""}
              </span>
            </span>
          ) : null}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className={`shrink-0 text-on-surface-variant/70 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? "rotate-180" : "rotate-0"
          }`}
          aria-hidden
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`border-t border-on-surface/[0.06] px-5 pb-5 pt-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              open ? "translate-y-0" : "-translate-y-1.5"
            }`}
          >
            {hasVisibleAccounts ? (
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13px] font-light text-on-surface/70">
                    Cuentas
                  </p>
                  <FormattedCurrency
                    value={accountsVisibleLiquidity}
                    className={`text-[1.35rem] font-light tabular-nums tracking-tight ${
                      accountStrained || accountEmpty
                        ? strainedAmountClass
                        : "text-on-surface"
                    }`}
                  />
                </div>
              </div>
            ) : null}

            {pockets.length > 0 ? (
              <div
                className={
                  hasVisibleAccounts
                    ? "mt-5 border-t border-on-surface/[0.06] pt-5"
                    : ""
                }
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13px] font-light text-on-surface/70">
                    Bolsillos
                  </p>
                  <FormattedCurrency
                    value={pocketsTotal}
                    className={`text-[1.35rem] font-light tabular-nums tracking-tight ${
                      pocketsTotal < 0 ? strainedAmountClass : "text-on-surface"
                    }`}
                  />
                </div>
                <ul className="mt-3 space-y-2">
                  {pockets.map((pocket) => (
                    <li
                      key={pocket.name}
                      className="flex items-baseline justify-between gap-3 text-[13px] font-light"
                    >
                      <span className="min-w-0 truncate text-on-surface/65">
                        «{pocket.name}»
                      </span>
                      <FormattedCurrency
                        value={pocket.balance}
                        className={`shrink-0 tabular-nums ${
                          pocket.balance < 0
                            ? strainedAmountClass
                            : "text-on-surface/80"
                        }`}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div
              className={
                hasVisibleAccounts || pockets.length > 0
                  ? "mt-5 border-t border-on-surface/[0.06] pt-5"
                  : ""
              }
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-light text-on-surface/70">
                  Gastado este mes
                </p>
                <FormattedCurrency
                  value={monthSpent}
                  className="text-[1.35rem] font-light tabular-nums tracking-tight text-on-surface"
                />
              </div>
              <p className="mt-2 text-[12px] font-light leading-relaxed text-on-surface-variant/80">
                Solo gastos reales (sin aportes ni traspasos).
              </p>
              {monthSpent > 0 ? (
                <Link
                  href="/history"
                  className="mt-3 inline-block text-[12px] font-light text-on-surface/70 underline-offset-4 hover:text-on-surface hover:underline"
                >
                  Ver en qué se ha ido
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
