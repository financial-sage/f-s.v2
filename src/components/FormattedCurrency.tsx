"use client";

import {
  formatCurrencyParts,
  splitFormattedMoney,
  type AppCurrency,
} from "@/lib/currency";
import { useCurrency } from "@/hooks/useCurrency";

const FRACTION_CLASS = "text-[0.72em] font-light tabular-nums opacity-80";

type MoneyProps = {
  value: number;
  currency?: AppCurrency;
  className?: string;
};

/** Renders a money amount with slightly smaller decimal digits. */
export function FormattedCurrency({ value, currency, className }: MoneyProps) {
  const { currency: hookCurrency } = useCurrency();
  const code = currency ?? hookCurrency;
  const parts = formatCurrencyParts(value, code);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === "fraction") {
          return (
            <span key={`${part.type}-${index}`} className={FRACTION_CLASS}>
              {part.value}
            </span>
          );
        }
        if (part.type === "decimal") {
          return (
            <span key={`${part.type}-${index}`} className={FRACTION_CLASS}>
              {part.value}
            </span>
          );
        }
        return <span key={`${part.type}-${index}`}>{part.value}</span>;
      })}
    </span>
  );
}

type SoftProps = {
  children: string;
  className?: string;
};

/** Same decimal treatment for pre-formatted money strings (insights, maps). */
export function SoftDecimals({ children, className }: SoftProps) {
  const { head, fraction, tail } = splitFormattedMoney(children);
  if (!fraction) {
    return <span className={className}>{children}</span>;
  }
  return (
    <span className={className}>
      {head}
      <span className={FRACTION_CLASS}>
        {fraction}
      </span>
      {tail}
    </span>
  );
}
