import type { FixedExpenseMonthItem } from "@/lib/fixed-expenses/types";

export function daysRemainingInMonth(now: Date = new Date()): number {
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.max(0, lastDay - now.getDate());
}

/** Calendar day numbers (1–31) of the current ISO week that fall in this month. */
export function daysOfCurrentWeekInMonth(now: Date = new Date()): number[] {
  const day = now.getDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
  const days: number[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      days.push(d.getDate());
    }
  }
  return days;
}

export type WeekPendingFixed = {
  name: string;
  amount: number;
  dueDay: number;
  isToday: boolean;
  /** Pending and due_day already passed (this month). */
  isOverdue: boolean;
  isPaid: boolean;
};

/** Max rows shown in the dashboard week strip before «Ver más». */
export const MAX_WEEK_VISIBLE = 3;

/** e.g. due day 4 in November → "nov 4" */
export function formatDueDayShort(
  dueDay: number,
  now: Date = new Date()
): string {
  const d = new Date(now.getFullYear(), now.getMonth(), dueDay);
  const month = new Intl.DateTimeFormat("es-ES", { month: "short" })
    .format(d)
    .replace(/\./g, "")
    .trim()
    .toLowerCase();
  return `${month} ${dueDay}`;
}

function amountOf(item: FixedExpenseMonthItem): number {
  if (item.payment.status === "paid" && item.payment.real_value != null) {
    return Math.round(Number(item.payment.real_value) * 100) / 100;
  }
  return Math.round((Number(item.payment.base_value_snapshot) || 0) * 100) / 100;
}

/**
 * Pending fixed expenses due this week, plus earlier unpaid dues this month
 * (so overdue installments stay visible). Items without due_day are excluded.
 */
export function listPendingFixedThisWeek(
  items: FixedExpenseMonthItem[],
  now: Date = new Date()
): WeekPendingFixed[] {
  const weekDays = new Set(daysOfCurrentWeekInMonth(now));
  const today = now.getDate();

  return items
    .filter((item) => {
      const due = item.template.due_day;
      if (due == null || !Number.isFinite(due)) return false;
      if (item.payment.status !== "pending") return false;
      // This week, or overdue earlier in the month.
      return weekDays.has(due) || due < today;
    })
    .map((item) => {
      const dueDay = Number(item.template.due_day);
      const isToday = dueDay === today;
      return {
        name: item.template.name,
        amount: amountOf(item),
        dueDay,
        isToday,
        isOverdue: dueDay < today,
        isPaid: item.payment.status === "paid",
      };
    })
    .sort((a, b) => {
      const rank = (x: WeekPendingFixed) =>
        x.isToday ? 0 : x.isOverdue ? 1 : 2;
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      return a.dueDay - b.dueDay;
    });
}
