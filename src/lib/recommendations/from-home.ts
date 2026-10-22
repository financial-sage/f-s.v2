import type { HomePageData } from "@/lib/dashboard";
import { sumMonthSpend } from "@/lib/decision/spend";
import {
  calculateFundCashBalance,
  calculatePersonalPocketBalance,
  calculateSoloPersonalFundBalance,
  getDefaultSharedFund,
  getPersonalFund,
  getSavingsFund,
  listDashboardSharedFunds,
  listSoloDashboardFunds,
  personalFundDisplayName,
} from "@/lib/funds";
import { buildRecommendationContext } from "./context";
import type { RecommendationContext } from "./types";

type ExpenseLike = {
  amount: number;
  paid_by: string;
  category?: string | null;
  responsible_for?: string | null;
  paid_from_fund?: boolean | null;
  fund_id?: string | null;
  account_id?: string | null;
  transfer_group_id?: string | null;
  expense_date: string;
};

export function recommendationContextFromHome(
  home: HomePageData
): RecommendationContext {
  const {
    userId,
    familyMemberCount,
    pocketBalance,
    personalBalance,
    fundBalance,
    funds,
    accountsVisibleLiquidity,
    hasVisibleAccounts,
    entitlement,
    coupleExpenses,
  } = home;

  const showCoupleUi =
    entitlement?.showCoupleUi ?? (familyMemberCount >= 2 && Boolean(home.familyId));

  const pocketOrHeroBalance = showCoupleUi
    ? fundBalance || personalBalance || pocketBalance
    : pocketBalance;

  const expenseRows: ExpenseLike[] = coupleExpenses.map((e) => ({
    amount: Number(e.amount),
    paid_by: e.paid_by,
    category: e.category,
    responsible_for: e.responsible_for,
    paid_from_fund: e.paid_from_fund,
    fund_id: e.fund_id,
    account_id: e.account_id,
    transfer_group_id: e.transfer_group_id,
    expense_date: e.expense_date,
  }));

  let pockets: { name: string; balance: number }[] = [];

  if (showCoupleUi) {
    const sharedForMenu = listDashboardSharedFunds(funds);
    const sharedIds = sharedForMenu.map((f) => f.id);
    const myPersonal = getPersonalFund(funds, userId);
    const legacySharedId = getDefaultSharedFund(funds)?.id ?? null;
    pockets = [
      ...sharedForMenu.map((fund) => ({
        name: fund.name,
        balance: calculateFundCashBalance(expenseRows, fund.id, {
          treatLegacyJointAsFundId: legacySharedId,
        }),
      })),
      ...(myPersonal
        ? [
            {
              name: personalFundDisplayName(myPersonal),
              balance: calculatePersonalPocketBalance(
                expenseRows,
                userId,
                sharedIds
              ),
            },
          ]
        : []),
    ];
  } else {
    const personalFunds = listSoloDashboardFunds(funds, userId);
    const defaultPersonal = getPersonalFund(personalFunds, userId);
    pockets = personalFunds.map((fund) => ({
      name: personalFundDisplayName(fund, {
        primaryId: defaultPersonal?.id ?? null,
      }),
      balance: calculateSoloPersonalFundBalance(
        expenseRows,
        fund,
        userId,
        defaultPersonal?.id ?? null
      ),
    }));
  }

  const savingsFund = getSavingsFund(funds);
  const savingsBalance = savingsFund
    ? calculateFundCashBalance(expenseRows, savingsFund.id)
    : 0;

  const monthSpent = sumMonthSpend(
    expenseRows.map((e) => ({ ...e, is_active: true }))
  );

  return buildRecommendationContext({
    hasVisibleAccounts,
    accountsVisibleLiquidity,
    pocketOrHeroBalance,
    monthSpent,
    pockets,
    hasSavingsFund: Boolean(savingsFund),
    savingsBalance,
    fundsCount: funds.length,
    memberCount: entitlement?.memberCount ?? familyMemberCount,
    isCoupleUi: showCoupleUi,
  });
}
