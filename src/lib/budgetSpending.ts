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

/**
 * Sum month spending that hits any of the budgeted envelope / limit ids
 * (direct category_id match, rolled-up parent id, or category name match).
 * Name matching covers simple-mode envelopes whose local id ≠ family_categories.id.
 */
export function sumSpendingForBudgetedIds(
  expenses: BudgetExpenseRow[],
  monthKey: string,
  categories: FamilyCategory[],
  budgetedIds: Iterable<string>,
  budgetedNames?: Iterable<string>,
) {
  const ids = budgetedIds instanceof Set ? budgetedIds : new Set(budgetedIds);
  const names = new Set(
    [...(budgetedNames ?? [])]
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean),
  );
  if (ids.size === 0 && names.size === 0) return 0;

  let total = 0;
  for (const expense of expenses) {
    if (!isBudgetExpense(expense)) continue;

    const date = new Date(expense.expense_date || expense.created_at || "");
    if (Number.isNaN(date.getTime())) continue;
    if (getMonthKey(date) !== monthKey) continue;

    const categoryId = expense.category_id?.trim() || null;
    if (categoryId && ids.has(categoryId)) {
      total += Number(expense.amount || 0);
      continue;
    }

    const parentId = budgetCategoryIdForExpense(categories, categoryId);
    if (parentId && ids.has(parentId)) {
      total += Number(expense.amount || 0);
      continue;
    }

    if (names.size > 0) {
      const label = String(expense.category ?? "")
        .trim()
        .toLowerCase();
      if (label && names.has(label)) {
        total += Number(expense.amount || 0);
      }
    }
  }

  return Math.round(total * 100) / 100;
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
