export type InsightConfidence = "high" | "medium" | "low" | "unknown";

export interface DecisionContext {
  hasVisibleAccounts: boolean;
  accountsVisibleLiquidity: number;
  pocketOrHeroBalance: number;
  monthSpent: number;
  fundsCount: number;
  memberCount: number;
  isCoupleUi: boolean;
}

export type DecisionContextInput = Partial<DecisionContext> &
  Pick<
    DecisionContext,
    | "hasVisibleAccounts"
    | "accountsVisibleLiquidity"
    | "pocketOrHeroBalance"
    | "monthSpent"
  >;

export function buildDecisionContext(input: DecisionContextInput): DecisionContext {
  return {
    hasVisibleAccounts: Boolean(input.hasVisibleAccounts),
    accountsVisibleLiquidity: Number(input.accountsVisibleLiquidity) || 0,
    pocketOrHeroBalance: Number(input.pocketOrHeroBalance) || 0,
    monthSpent: Number(input.monthSpent) || 0,
    fundsCount: Math.max(0, Math.floor(Number(input.fundsCount) || 0)),
    memberCount: Math.max(1, Math.floor(Number(input.memberCount) || 1)),
    isCoupleUi: Boolean(input.isCoupleUi),
  };
}
