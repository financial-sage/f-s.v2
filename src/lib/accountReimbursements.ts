/**
 * Pending reimbursements when a spend was paid from one account
 * but attributed to another (budget / envelope default).
 *
 * Convention: budgetAccountId owes paidAccountId (debtor → creditor).
 */

const EXCLUDED_CATEGORIES = new Set(["deposit", "withdrawal", "transfer"]);

export type ReimbursementExpenseLike = {
  id?: string;
  amount: number;
  category?: string | null;
  concept?: string | null;
  account_id?: string | null;
  budget_account_id?: string | null;
  paid_from_account?: boolean | null;
  is_active?: boolean | null;
  is_settled?: boolean | null;
  transfer_group_id?: string | null;
};

export type AccountReimbursement = {
  /** Account that should have paid (budget). */
  debtorAccountId: string;
  /** Account that actually paid. */
  creditorAccountId: string;
  amount: number;
  expenseIds: string[];
};

export type NamedAccountReimbursement = AccountReimbursement & {
  debtorAccountName: string;
  creditorAccountName: string;
};

function isCrossAccountAdvance(expense: ReimbursementExpenseLike) {
  if (expense.is_active === false) return false;
  if (expense.is_settled === true) return false;
  if (expense.paid_from_account !== true) return false;
  if (expense.transfer_group_id) return false;

  const category = String(expense.category ?? "").toLowerCase();
  if (EXCLUDED_CATEGORIES.has(category)) return false;
  if (expense.concept === "Reembolso del fondo") return false;
  if (String(expense.concept ?? "").startsWith("Liquidación de deuda")) {
    return false;
  }

  const paidId = expense.account_id?.trim() || null;
  const budgetId = expense.budget_account_id?.trim() || null;
  if (!paidId || !budgetId) return false;
  if (paidId === budgetId) return false;

  const amount = Number(expense.amount || 0);
  return Number.isFinite(amount) && amount > 0;
}

/**
 * Net pending reimbursements between account pairs.
 * Positive amount: debtorAccountId owes creditorAccountId.
 */
export function computePendingAccountReimbursements(
  expenses: ReimbursementExpenseLike[],
): AccountReimbursement[] {
  const byPair = new Map<
    string,
    { debtor: string; creditor: string; amount: number; expenseIds: string[] }
  >();

  for (const expense of expenses) {
    if (!isCrossAccountAdvance(expense)) continue;

    const debtor = expense.budget_account_id!.trim();
    const creditor = expense.account_id!.trim();
    const key = `${debtor}→${creditor}`;
    const amount = Math.round(Number(expense.amount) * 100) / 100;
    const prev = byPair.get(key);

    if (prev) {
      prev.amount = Math.round((prev.amount + amount) * 100) / 100;
      if (expense.id) prev.expenseIds.push(expense.id);
    } else {
      byPair.set(key, {
        debtor,
        creditor,
        amount,
        expenseIds: expense.id ? [expense.id] : [],
      });
    }
  }

  // Net opposing pairs (A→B vs B→A)
  const seen = new Set<string>();
  const netted: AccountReimbursement[] = [];

  for (const entry of byPair.values()) {
    const forwardKey = `${entry.debtor}→${entry.creditor}`;
    const reverseKey = `${entry.creditor}→${entry.debtor}`;
    if (seen.has(forwardKey) || seen.has(reverseKey)) continue;
    seen.add(forwardKey);
    seen.add(reverseKey);

    const reverse = byPair.get(reverseKey);
    if (!reverse) {
      if (entry.amount > 0.009) {
        netted.push({
          debtorAccountId: entry.debtor,
          creditorAccountId: entry.creditor,
          amount: entry.amount,
          expenseIds: entry.expenseIds,
        });
      }
      continue;
    }

    const diff = Math.round((entry.amount - reverse.amount) * 100) / 100;
    if (Math.abs(diff) < 0.01) continue;

    if (diff > 0) {
      netted.push({
        debtorAccountId: entry.debtor,
        creditorAccountId: entry.creditor,
        amount: diff,
        expenseIds: [...entry.expenseIds, ...reverse.expenseIds],
      });
    } else {
      netted.push({
        debtorAccountId: reverse.debtor,
        creditorAccountId: reverse.creditor,
        amount: Math.abs(diff),
        expenseIds: [...entry.expenseIds, ...reverse.expenseIds],
      });
    }
  }

  return netted.sort((a, b) => b.amount - a.amount);
}

export function nameAccountReimbursements(
  rows: AccountReimbursement[],
  accounts: Array<{ id: string; name: string }>,
): NamedAccountReimbursement[] {
  const byId = new Map(accounts.map((a) => [a.id, a.name]));
  return rows.map((row) => ({
    ...row,
    debtorAccountName: byId.get(row.debtorAccountId) ?? "Cuenta",
    creditorAccountName: byId.get(row.creditorAccountId) ?? "Cuenta",
  }));
}
