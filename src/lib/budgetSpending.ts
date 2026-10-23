import { getMonthKey } from "@/lib/budget";
import type { FamilyCategory } from "@/lib/familyCategories";
import { budgetCategoryIdForExpense } from "@/lib/familyCategories";

const EXCLUDED_CATEGORIES = new Set(["deposit", "withdrawal", "transfer"]);

export interface BudgetExpenseRow {
  amount: number;
  category?: string | null;
  category_id?: string | null;
  spend_segment?: string | null;
  expense_date?: string | null;
  created_at?: string;
  concept?: string | null;
}

function isBudgetExpense(expense: BudgetExpenseRow) {
  const category = String(expense.category ?? "").toLowerCase();
  if (EXCLUDED_CATEGORIES.has(category)) return false;
  if (expense.concept === "Reembolso del fondo") return false;
  if (String(expense.concept ?? "").startsWith("Liquidación de deuda")) {
    return false;
  }
  return true;
}

/**
 * Spent totals keyed by **parent** category id (subcategories roll up).
 */
export function computeSpendingByParentCategory(
  expenses: BudgetExpenseRow[],
  monthKey: string,
  categories: FamilyCategory[]
) {
  const totals = new Map<string, number>();

  for (const expense of expenses) {
    if (!isBudgetExpense(expense)) continue;

    const date = new Date(expense.expense_date || expense.created_at || "");
    if (Number.isNaN(date.getTime())) continue;
    if (getMonthKey(date) !== monthKey) continue;

    const parentId = budgetCategoryIdForExpense(categories, expense.category_id);
    if (!parentId) continue;

    const amount = Number(expense.amount || 0);
    totals.set(parentId, (totals.get(parentId) ?? 0) + amount);
  }

  return totals;
}

/** @deprecated */
export function computeSpendingBySegment(
  expenses: BudgetExpenseRow[],
  monthKey: string
) {
  return computeSpendingByParentCategory(expenses, monthKey, []);
}

/** @deprecated */
export function computeSpendingByCategory(
  expenses: BudgetExpenseRow[],
  monthKey: string
) {
  return computeSpendingByParentCategory(expenses, monthKey, []);
}
