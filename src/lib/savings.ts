import { getMonthKey, shiftMonthKey } from "@/lib/budget";
import {
  calculateFundCashBalance,
  getSavingsFund,
  type FamilyFund,
  type FundExpenseLike,
} from "@/lib/funds";

export type SavingsMonthMetrics = {
  monthKey: string;
  prevMonthKey: string;
  thisMonth: number;
  prevMonth: number;
  delta: number;
  /** True when previous month had no contributions (avoid fake %). */
  prevMonthEmpty: boolean;
  percentChange: number | null;
};

function monthKeyFromExpenseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return getMonthKey(date);
}

/** Sum of inbound deposits to the savings pot in a calendar month. */
export function sumSavingsContributionsInMonth(
  expenses: FundExpenseLike[],
  savingsFundId: string,
  monthKey: string
) {
  let total = 0;
  for (const expense of expenses) {
    if (expense.is_active === false) continue;
    if (expense.fund_id !== savingsFundId) continue;
    if (String(expense.category ?? "").toLowerCase() !== "deposit") continue;
    const key = monthKeyFromExpenseDate(
      (expense as { expense_date?: string | null }).expense_date ?? null
    );
    if (key !== monthKey) continue;
    total += Number(expense.amount || 0);
  }
  return Math.round(total * 100) / 100;
}

export function computeSavingsMonthMetrics(
  expenses: Array<FundExpenseLike & { expense_date?: string | null }>,
  savingsFundId: string,
  referenceDate: Date = new Date()
): SavingsMonthMetrics {
  const monthKey = getMonthKey(referenceDate);
  const prevMonthKey = shiftMonthKey(monthKey, -1);
  const thisMonth = sumSavingsContributionsInMonth(expenses, savingsFundId, monthKey);
  const prevMonth = sumSavingsContributionsInMonth(expenses, savingsFundId, prevMonthKey);
  const delta = Math.round((thisMonth - prevMonth) * 100) / 100;
  const prevMonthEmpty = prevMonth <= 0.009;
  const percentChange =
    prevMonthEmpty || prevMonth === 0
      ? null
      : Math.round(((thisMonth - prevMonth) / prevMonth) * 1000) / 10;

  return {
    monthKey,
    prevMonthKey,
    thisMonth,
    prevMonth,
    delta,
    prevMonthEmpty,
    percentChange,
  };
}

export function calculateSavingsBalance(
  expenses: FundExpenseLike[],
  funds: FamilyFund[]
) {
  const savings = getSavingsFund(funds);
  if (!savings) return 0;
  return calculateFundCashBalance(expenses, savings.id, {
    treatLegacyJointAsFundId: null,
  });
}
