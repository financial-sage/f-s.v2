import type { FixedExpenseFrequency } from "@/lib/fixed-expenses/frequency";
import type { FixedExpenseScope } from "@/lib/fixed-expenses/scope";

export type { FixedExpenseScope } from "@/lib/fixed-expenses/scope";

export type FixedExpensePaymentStatus = "pending" | "paid";

export interface FixedExpenseTemplate {
  id: string;
  family_id: string;
  name: string;
  base_value: number;
  due_day: number | null;
  frequency: FixedExpenseFrequency;
  /** Calendar month 1–12 that anchors the multi-period cycle. */
  anchor_month: number;
  /** Family shared pocket vs personal (Mi bolsillo). */
  scope: FixedExpenseScope;
  /** Set when scope = personal; null for shared. */
  owner_profile_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FixedExpensePayment {
  id: string;
  family_id: string;
  fixed_expense_id: string;
  month_key: string;
  base_value_snapshot: number;
  real_value: number | null;
  status: FixedExpensePaymentStatus;
  paid_at: string | null;
  paid_by: string | null;
  expense_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FixedExpenseMonthItem {
  template: FixedExpenseTemplate;
  payment: FixedExpensePayment;
}

export interface FixedExpenseMonthSnapshot {
  familyId: string;
  monthKey: string;
  budgetTotal: number;
  /** Sum of monthly equivalents of all active templates (capacity weight). */
  monthlyCommitted: number;
  pocketDeposits: number;
  /** Shared fixed-expenses pocket cash. */
  pocketAvailable: number;
  /** Current user's personal pocket (Mi bolsillo) cash. */
  personalPocketAvailable: number;
  items: FixedExpenseMonthItem[];
  fixedFundId: string | null;
  personalFundId: string | null;
}

export interface FixedExpenseDerivedTotals {
  sumBase: number;
  sumReal: number;
  /** Sum of bases due this month — planning target only, not pocket cash. */
  budgetTotal: number;
  /** Capacity weight across all active templates (monthly equivalent). */
  monthlyCommitted: number;
  pocketDeposits: number;
  /** Same cash balance as dashboard: aportes − pagos/retiros. */
  pocketBalance: number;
  remaining: number;
  variance: number;
  paidCount: number;
  totalCount: number;
}
