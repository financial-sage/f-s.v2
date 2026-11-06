import type { BudgetGroup } from "@/lib/budgetEnvelopes";
import { normalizeDueDay } from "@/lib/budgetEnvelopes";
import { getMonthKey } from "@/lib/budget";
import type { BudgetExpenseRow } from "@/lib/budgetSpending";

export type UpcomingPaymentStatus = "Pendiente" | "Pagado";

export type UpcomingWeeklyPayment = {
  id: string;
  groupId: string;
  name: string;
  amount: number;
  dueDay: number;
  status: UpcomingPaymentStatus;
  /** 0 = today, 1 = tomorrow, … within the 7-day window. */
  daysUntil: number;
  /** Human label: "Hoy", "En 2 días", "El día 15". */
  label: string;
};

const EXCLUDED = new Set(["deposit", "withdrawal", "transfer"]);

function isSpendExpense(expense: BudgetExpenseRow) {
  const category = String(expense.category ?? "").toLowerCase();
  if (EXCLUDED.has(category)) return false;
  if (expense.concept === "Reembolso del fondo") return false;
  if (String(expense.concept ?? "").startsWith("Liquidación de deuda")) {
    return false;
  }
  return true;
}

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function proximityLabel(daysUntil: number, dueDay: number): string {
  if (daysUntil === 0) return "Hoy";
  if (daysUntil === 1) return "Mañana";
  if (daysUntil <= 6) return `En ${daysUntil} días`;
  return `El día ${dueDay}`;
}

/** Calendar days in the next `windowDays` starting today (inclusive). */
export function upcomingDueDayWindow(
  now: Date = new Date(),
  windowDays = 7,
): Array<{ dueDay: number; daysUntil: number; date: Date }> {
  const out: Array<{ dueDay: number; daysUntil: number; date: Date }> = [];
  for (let i = 0; i < windowDays; i += 1) {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + i,
    );
    out.push({
      dueDay: date.getDate(),
      daysUntil: i,
      date,
    });
  }
  return out;
}

function leafHasPaymentThisMonth(
  expenses: BudgetExpenseRow[],
  monthKey: string,
  leaf: { id: string; name: string },
): boolean {
  const needle = normalizeLabel(leaf.name);
  for (const expense of expenses) {
    if (!isSpendExpense(expense)) continue;
    const date = new Date(expense.expense_date || expense.created_at || "");
    if (Number.isNaN(date.getTime())) continue;
    if (getMonthKey(date) !== monthKey) continue;

    const categoryId = expense.category_id?.trim() || null;
    if (categoryId && categoryId === leaf.id) return true;

    const label = normalizeLabel(String(expense.category ?? ""));
    if (label && needle && label === needle) return true;
  }
  return false;
}

type PaymentLeaf = {
  id: string;
  groupId: string;
  name: string;
  amount: number;
  dueDay: number;
};

function collectDueLeaves(groups: BudgetGroup[]): PaymentLeaf[] {
  const leaves: PaymentLeaf[] = [];
  for (const group of groups) {
    if (group.segments.length > 0) {
      for (const seg of group.segments) {
        const dueDay = normalizeDueDay(seg.dueDay);
        if (dueDay == null) continue;
        leaves.push({
          id: seg.id,
          groupId: group.id,
          name: seg.name.trim() || group.name,
          amount: Math.round((Number(seg.amount) || 0) * 100) / 100,
          dueDay,
        });
      }
    } else {
      const dueDay = normalizeDueDay(group.dueDay);
      if (dueDay == null) continue;
      leaves.push({
        id: group.id,
        groupId: group.id,
        name: group.name.trim() || "Presupuesto",
        amount: Math.round((Number(group.amount) || 0) * 100) / 100,
        dueDay,
      });
    }
  }
  return leaves;
}

/**
 * Segments / flat groups with `dueDay` falling in the next 7 calendar days,
 * marked Pendiente/Pagado from month expenses on that leaf.
 */
export function getUpcomingWeeklyPayments(
  budgetGroups: BudgetGroup[],
  expensesThisMonth: BudgetExpenseRow[],
  options?: { now?: Date; monthKey?: string },
): UpcomingWeeklyPayment[] {
  const now = options?.now ?? new Date();
  const monthKey = options?.monthKey ?? getMonthKey(now);
  const window = upcomingDueDayWindow(now, 7);
  // A dueDay may appear twice around month end (e.g. 30 then next month 30) —
  // keep the soonest occurrence.
  const soonest = new Map<number, { daysUntil: number }>();
  for (const slot of window) {
    const prev = soonest.get(slot.dueDay);
    if (!prev || slot.daysUntil < prev.daysUntil) {
      soonest.set(slot.dueDay, { daysUntil: slot.daysUntil });
    }
  }

  const results: UpcomingWeeklyPayment[] = [];
  for (const leaf of collectDueLeaves(budgetGroups)) {
    const slot = soonest.get(leaf.dueDay);
    if (!slot) continue;
    const paid = leafHasPaymentThisMonth(
      expensesThisMonth,
      monthKey,
      leaf,
    );
    results.push({
      id: leaf.id,
      groupId: leaf.groupId,
      name: leaf.name,
      amount: leaf.amount,
      dueDay: leaf.dueDay,
      status: paid ? "Pagado" : "Pendiente",
      daysUntil: slot.daysUntil,
      label: proximityLabel(slot.daysUntil, leaf.dueDay),
    });
  }

  return results.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    if (a.status !== b.status) {
      return a.status === "Pendiente" ? -1 : 1;
    }
    return a.name.localeCompare(b.name, "es");
  });
}
