import {
  resolveAccountColor,
  type FamilyAccount,
} from "@/lib/accounts";
import {
  DEFAULT_PERSONAL_FUND_COLOR,
  resolveFundColor,
  resolveFundIdForExpense,
  type FamilyFund,
  type FundExpenseLike,
} from "@/lib/funds";

/**
 * Icon chip accent for a ledger row: account color when paid from account,
 * otherwise the expense's fund color (not the dashboard-selected fund).
 */
export function resolveMovementIconColor(
  expense: FundExpenseLike,
  funds: FamilyFund[],
  accounts: Pick<FamilyAccount, "id" | "color" | "scope">[] = [],
  currentUserId?: string
): string {
  if (expense.account_id && !expense.fund_id) {
    const account = accounts.find((a) => a.id === expense.account_id);
    if (account) return resolveAccountColor(account);
  }

  const fundId = resolveFundIdForExpense(expense, funds, currentUserId);
  const fund = fundId ? funds.find((f) => f.id === fundId) ?? null : null;
  return fund ? resolveFundColor(fund) : DEFAULT_PERSONAL_FUND_COLOR;
}
