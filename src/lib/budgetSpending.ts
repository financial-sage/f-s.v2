import { extraCategories, topCategories } from "@/lib/categoryMap";
import { getMonthKey } from "@/lib/budget";

const ALL_CATEGORY_TILES = [...topCategories, ...extraCategories];

const EXCLUDED_CATEGORIES = new Set(["deposit", "withdrawal", "transfer"]);

export interface BudgetExpenseRow {
  amount: number;
  category?: string | null;
  expense_date?: string | null;
  created_at?: string;
  concept?: string | null;
}

export function normalizeCategoryId(raw?: string | null) {
  if (!raw) return "misc";

  const byId = ALL_CATEGORY_TILES.find((c) => c.id === raw);
  if (byId) return byId.id;

  const byValue = ALL_CATEGORY_TILES.find((c) => c.value === raw);
  if (byValue) return byValue.id;

  return raw;
}

function isBudgetExpense(expense: BudgetExpenseRow) {
  const category = String(expense.category ?? "").toLowerCase();
  if (EXCLUDED_CATEGORIES.has(category)) return false;
  if (expense.concept === "Reembolso del fondo") return false;
  if (String(expense.concept ?? "").startsWith("Liquidación de deuda")) return false;
  return true;
}

export function computeSpendingByCategory(
  expenses: BudgetExpenseRow[],
  monthKey: string,
) {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    if (!isBudgetExpense(expense)) continue;

    const date = new Date(expense.expense_date || expense.created_at || "");
    if (Number.isNaN(date.getTime())) continue;
    if (getMonthKey(date) !== monthKey) continue;

    const categoryId = normalizeCategoryId(expense.category);
    const amount = Number(expense.amount || 0);
    totals.set(categoryId, (totals.get(categoryId) ?? 0) + amount);
  }

  return totals;
}
