/** Movements that are not “gasto” for guidance copy. */
export function isNonSpendCategory(category?: string | null): boolean {
  const c = String(category ?? "").trim().toLowerCase();
  return c === "deposit" || c === "withdrawal";
}

/**
 * Sum of real spends in the current calendar month (excludes deposits/withdrawals).
 */
export function sumMonthSpend(
  expenses: Array<{
    amount: number | string;
    category?: string | null;
    expense_date?: string | null;
    is_active?: boolean | null;
  }>,
  now: Date = new Date()
): number {
  const month = now.getMonth();
  const year = now.getFullYear();

  const total = expenses.reduce((sum, expense) => {
    if (expense.is_active === false) return sum;
    if (isNonSpendCategory(expense.category)) return sum;
    const raw = expense.expense_date;
    if (!raw) return sum;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return sum;
    if (date.getMonth() !== month || date.getFullYear() !== year) return sum;
    return sum + Number(expense.amount || 0);
  }, 0);

  return Math.round(total * 100) / 100;
}
