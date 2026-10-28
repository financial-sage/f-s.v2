import { formatMonthLabel, getMonthKey, shiftMonthKey } from "@/lib/budget";
import { isNonSpendCategory } from "@/lib/decision/spend";
import {
  isFixedExpensesFund,
  isSavingsFund,
  personalFundDisplayName,
  type FamilyFund,
  type FundExpenseLike,
} from "@/lib/funds";

export type FundBalanceExpense = FundExpenseLike & {
  id?: string;
  expense_date?: string | null;
  concept?: string | null;
};

export type FundPayerSpend = {
  profileId: string;
  name: string;
  amount: number;
};

export type FundMonthStats = {
  fundId: string;
  fundName: string;
  spentThisMonth: number;
  spentLastMonth: number;
  delta: number;
  deltaPct: number | null;
  byPayer?: FundPayerSpend[];
};

export type FundRecentMovement = {
  id: string;
  amount: number;
  concept: string | null;
  expense_date: string | null;
  paid_by: string;
  payerName: string;
};

export type FundMonthHistoryPoint = {
  monthKey: string;
  monthLabel: string;
  monthLabelShort: string;
  spent: number;
  byPayer?: FundPayerSpend[];
};

export type FundStoryCopy = {
  headline: string;
  detail: string | null;
};

function monthKeyFromExpenseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return getMonthKey(date);
}

/** Current month first, then older — e.g. n=6 → [now, now-1, …, now-5]. */
export function listMonthKeys(n = 6, referenceDate: Date = new Date()) {
  const keys: string[] = [];
  const current = getMonthKey(referenceDate);
  for (let i = 0; i < n; i += 1) {
    keys.push(i === 0 ? current : shiftMonthKey(current, -i));
  }
  return keys;
}

export function formatMonthLabelShort(monthKey: string) {
  const date = new Date(`${monthKey}-01T12:00:00`);
  if (Number.isNaN(date.getTime())) return monthKey;
  const label = new Intl.DateTimeFormat("es-ES", { month: "short" }).format(date);
  return label.replace(/\.$/, "");
}

/** Spending pockets shown in /bolsillos (not Ahorro / Gastos fijos). */
export function isBalanceReportFund(fund: FamilyFund) {
  if (fund.archived_at) return false;
  if (isSavingsFund(fund) || isFixedExpensesFund(fund)) return false;
  return true;
}

export function isFundSpendRow(expense: FundBalanceExpense) {
  if (expense.is_active === false) return false;
  if (!expense.fund_id) return false;
  if (isNonSpendCategory(expense.category)) return false;
  if (expense.transfer_group_id) return false;
  // Account-only cash without fund imputation is not bolsillo spend.
  if (expense.account_id && !expense.fund_id) return false;
  return true;
}

export function sumSpendForFundInMonth(
  expenses: FundBalanceExpense[],
  fundId: string,
  monthKey: string
) {
  let total = 0;
  for (const expense of expenses) {
    if (!isFundSpendRow(expense)) continue;
    if (expense.fund_id !== fundId) continue;
    if (monthKeyFromExpenseDate(expense.expense_date) !== monthKey) continue;
    total += Number(expense.amount || 0);
  }
  return Math.round(total * 100) / 100;
}

export function sumSpendByPayerForFundInMonth(
  expenses: FundBalanceExpense[],
  fundId: string,
  monthKey: string,
  nameById: Record<string, string>
): FundPayerSpend[] {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    if (!isFundSpendRow(expense)) continue;
    if (expense.fund_id !== fundId) continue;
    if (monthKeyFromExpenseDate(expense.expense_date) !== monthKey) continue;
    const payer = String(expense.paid_by ?? "").trim();
    if (!payer) continue;
    totals.set(payer, (totals.get(payer) ?? 0) + Number(expense.amount || 0));
  }

  return [...totals.entries()]
    .map(([profileId, amount]) => ({
      profileId,
      name: nameById[profileId] || "Alguien",
      amount: Math.round(amount * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function deltaPct(thisMonth: number, lastMonth: number): number | null {
  if (lastMonth <= 0.009) return null;
  return Math.round(((thisMonth - lastMonth) / lastMonth) * 1000) / 10;
}

export function buildFundMonthStats(options: {
  fund: FamilyFund;
  displayName: string;
  expenses: FundBalanceExpense[];
  monthKey: string;
  prevMonthKey: string;
  includeByPayer: boolean;
  nameById: Record<string, string>;
}): FundMonthStats {
  const {
    fund,
    displayName,
    expenses,
    monthKey,
    prevMonthKey,
    includeByPayer,
    nameById,
  } = options;
  const spentThisMonth = sumSpendForFundInMonth(expenses, fund.id, monthKey);
  const spentLastMonth = sumSpendForFundInMonth(expenses, fund.id, prevMonthKey);
  const delta = roundMoney(spentThisMonth - spentLastMonth);

  return {
    fundId: fund.id,
    fundName: displayName,
    spentThisMonth,
    spentLastMonth,
    delta,
    deltaPct: deltaPct(spentThisMonth, spentLastMonth),
    byPayer: includeByPayer
      ? sumSpendByPayerForFundInMonth(expenses, fund.id, monthKey, nameById)
      : undefined,
  };
}

export function pickTopMovers(stats: FundMonthStats[], limit = 3) {
  const withMovement = stats.filter((s) => Math.abs(s.delta) >= 0.01);
  const topUp = [...withMovement]
    .filter((s) => s.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, limit);
  const topDown = [...withMovement]
    .filter((s) => s.delta < 0)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, limit);
  return { topUp, topDown };
}

export function listRecentFundSpends(
  expenses: FundBalanceExpense[],
  fundId: string,
  nameById: Record<string, string>,
  limit = 8
): FundRecentMovement[] {
  const rows = expenses
    .filter((e) => isFundSpendRow(e) && e.fund_id === fundId && e.id)
    .sort((a, b) => {
      const da = String(a.expense_date ?? "");
      const db = String(b.expense_date ?? "");
      if (da !== db) return db.localeCompare(da);
      return String(b.id).localeCompare(String(a.id));
    })
    .slice(0, limit);

  return rows.map((e) => ({
    id: String(e.id),
    amount: Number(e.amount || 0),
    concept: e.concept ?? null,
    expense_date: e.expense_date ?? null,
    paid_by: e.paid_by,
    payerName: nameById[e.paid_by] || "Alguien",
  }));
}

export function buildFundMonthHistory(options: {
  expenses: FundBalanceExpense[];
  fundId: string;
  monthKeys: string[];
  includeByPayer: boolean;
  nameById: Record<string, string>;
}): FundMonthHistoryPoint[] {
  const { expenses, fundId, monthKeys, includeByPayer, nameById } = options;
  return monthKeys.map((monthKey) => ({
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    monthLabelShort: formatMonthLabelShort(monthKey),
    spent: sumSpendForFundInMonth(expenses, fundId, monthKey),
    byPayer: includeByPayer
      ? sumSpendByPayerForFundInMonth(expenses, fundId, monthKey, nameById)
      : undefined,
  }));
}

export function listFundSpendsInMonth(
  expenses: FundBalanceExpense[],
  fundId: string,
  monthKey: string,
  nameById: Record<string, string>,
  limit = 40
): FundRecentMovement[] {
  const rows = expenses
    .filter(
      (e) =>
        isFundSpendRow(e) &&
        e.fund_id === fundId &&
        e.id &&
        monthKeyFromExpenseDate(e.expense_date) === monthKey
    )
    .sort((a, b) => {
      const da = String(a.expense_date ?? "");
      const db = String(b.expense_date ?? "");
      if (da !== db) return db.localeCompare(da);
      return String(b.id).localeCompare(String(a.id));
    })
    .slice(0, limit);

  return rows.map((e) => ({
    id: String(e.id),
    amount: Number(e.amount || 0),
    concept: e.concept ?? null,
    expense_date: e.expense_date ?? null,
    paid_by: e.paid_by,
    payerName: nameById[e.paid_by] || "Alguien",
  }));
}

/** All spends for a fund inside a set of month keys (for client-side month filter). */
export function listFundSpendsInWindow(
  expenses: FundBalanceExpense[],
  fundId: string,
  monthKeys: string[],
  nameById: Record<string, string>,
  limit = 120
): FundRecentMovement[] {
  const allowed = new Set(monthKeys);
  const rows = expenses
    .filter((e) => {
      if (!isFundSpendRow(e) || e.fund_id !== fundId || !e.id) return false;
      const key = monthKeyFromExpenseDate(e.expense_date);
      return key != null && allowed.has(key);
    })
    .sort((a, b) => {
      const da = String(a.expense_date ?? "");
      const db = String(b.expense_date ?? "");
      if (da !== db) return db.localeCompare(da);
      return String(b.id).localeCompare(String(a.id));
    })
    .slice(0, limit);

  return rows.map((e) => ({
    id: String(e.id),
    amount: Number(e.amount || 0),
    concept: e.concept ?? null,
    expense_date: e.expense_date ?? null,
    paid_by: e.paid_by,
    payerName: nameById[e.paid_by] || "Alguien",
  }));
}

export function buildFundStoryCopy(options: {
  spent: number;
  prevSpent: number;
  monthLabel: string;
  formatCurrency: (n: number) => string;
  byPayer?: FundPayerSpend[];
  isCouple: boolean;
}): FundStoryCopy {
  const { spent, prevSpent, monthLabel, formatCurrency, byPayer, isCouple } = options;
  const prevEmpty = prevSpent <= 0.009;
  const delta = roundMoney(spent - prevSpent);
  const pct = deltaPct(spent, prevSpent);

  let headline: string;
  if (spent <= 0.009 && prevEmpty) {
    headline = `Sin gasto registrado en ${monthLabel.toLowerCase()}.`;
  } else if (prevEmpty) {
    headline =
      spent > 0
        ? `En ${monthLabel.toLowerCase()} gastaste ${formatCurrency(spent)} — primer mes con movimiento.`
        : `Sin gasto en ${monthLabel.toLowerCase()}.`;
  } else if (Math.abs(delta) < 0.01) {
    headline = `En ${monthLabel.toLowerCase()} gastaste ${formatCurrency(spent)}, igual que el mes anterior.`;
  } else if (delta > 0) {
    const pctLabel = pct != null ? ` (${Math.abs(pct)}%)` : "";
    headline = `En ${monthLabel.toLowerCase()} gastaste ${formatCurrency(spent)}: ${formatCurrency(delta)} más que el mes anterior${pctLabel}.`;
  } else {
    const pctLabel = pct != null ? ` (${Math.abs(pct)}%)` : "";
    headline = `En ${monthLabel.toLowerCase()} gastaste ${formatCurrency(spent)}: ${formatCurrency(Math.abs(delta))} menos que el mes anterior${pctLabel}.`;
  }

  let detail: string | null = null;
  if (isCouple && byPayer && byPayer.length > 0 && spent > 0.009) {
    const top = byPayer[0];
    const share = Math.round((top.amount / spent) * 100);
    if (byPayer.length === 1) {
      detail = `${top.name} registró todo el gasto de este bolsillo.`;
    } else if (share >= 55) {
      detail = `${top.name} concentró el ${share}% del gasto.`;
    } else {
      detail = `El gasto se repartió: ${top.name} ${formatCurrency(top.amount)}, ${byPayer[1].name} ${formatCurrency(byPayer[1].amount)}.`;
    }
  }

  return { headline, detail };
}

export function firstName(full?: string | null) {
  const part = String(full ?? "")
    .trim()
    .split(/\s+/)[0];
  return part || "Alguien";
}

export function displayFundNameForBalance(
  fund: FamilyFund,
  primaryPersonalId?: string | null
) {
  if (fund.scope === "personal") {
    return personalFundDisplayName(fund, { primaryId: primaryPersonalId ?? null });
  }
  return fund.name;
}

export function monthWindow(referenceDate: Date = new Date()) {
  const monthKey = getMonthKey(referenceDate);
  const prevMonthKey = shiftMonthKey(monthKey, -1);
  return {
    monthKey,
    prevMonthKey,
    monthLabel: formatMonthLabel(monthKey),
  };
}

export { formatMonthLabel, getMonthKey, shiftMonthKey };
