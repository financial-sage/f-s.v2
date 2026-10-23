import type { RecommendationContext } from "./types";

export type RecommendationContextInput = Partial<RecommendationContext> &
  Pick<
    RecommendationContext,
    | "hasVisibleAccounts"
    | "accountsVisibleLiquidity"
    | "pocketOrHeroBalance"
    | "monthSpent"
  >;

export function buildRecommendationContext(
  input: RecommendationContextInput
): RecommendationContext {
  const pockets = Array.isArray(input.pockets)
    ? input.pockets
        .map((p) => ({
          name: String(p?.name ?? "").trim(),
          balance: Number(p?.balance) || 0,
        }))
        .filter((p) => p.name.length > 0)
    : [];

  const negativePocketCount =
    typeof input.negativePocketCount === "number"
      ? Math.max(0, Math.floor(input.negativePocketCount))
      : pockets.filter((p) => p.balance < 0).length;

  return {
    hasVisibleAccounts: Boolean(input.hasVisibleAccounts),
    accountsVisibleLiquidity: Number(input.accountsVisibleLiquidity) || 0,
    pocketOrHeroBalance: Number(input.pocketOrHeroBalance) || 0,
    monthSpent: Number(input.monthSpent) || 0,
    ledgerMovementCount: Math.max(
      0,
      Math.floor(Number(input.ledgerMovementCount) || 0)
    ),
    pockets,
    negativePocketCount,
    hasSavingsFund: Boolean(input.hasSavingsFund),
    savingsBalance: Number(input.savingsBalance) || 0,
    fundsCount: Math.max(0, Math.floor(Number(input.fundsCount) || 0)),
    memberCount: Math.max(1, Math.floor(Number(input.memberCount) || 1)),
    isCoupleUi: Boolean(input.isCoupleUi),
  };
}
