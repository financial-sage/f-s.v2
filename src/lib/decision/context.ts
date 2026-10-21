export type InsightConfidence = "high" | "medium" | "low" | "unknown";

export interface DecisionPocketSnapshot {
  name: string;
  balance: number;
}

export interface DecisionContext {
  hasVisibleAccounts: boolean;
  accountsVisibleLiquidity: number;
  pocketOrHeroBalance: number;
  /** Display name of the pocket currently shown on home (hero). */
  activePocketName: string | null;
  /** Active spending pockets visible to this user (with balances). */
  pockets: DecisionPocketSnapshot[];
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
  const pockets = Array.isArray(input.pockets)
    ? input.pockets
        .map((p) => ({
          name: String(p?.name ?? "").trim(),
          balance: Number(p?.balance) || 0,
        }))
        .filter((p) => p.name.length > 0)
    : [];

  const activePocketName =
    String(input.activePocketName ?? "").trim() ||
    pockets[0]?.name ||
    null;

  return {
    hasVisibleAccounts: Boolean(input.hasVisibleAccounts),
    accountsVisibleLiquidity: Number(input.accountsVisibleLiquidity) || 0,
    pocketOrHeroBalance: Number(input.pocketOrHeroBalance) || 0,
    activePocketName,
    pockets,
    monthSpent: Number(input.monthSpent) || 0,
    fundsCount: Math.max(0, Math.floor(Number(input.fundsCount) || 0)),
    memberCount: Math.max(1, Math.floor(Number(input.memberCount) || 1)),
    isCoupleUi: Boolean(input.isCoupleUi),
  };
}

/** «Mi bolsillo» or fallback “este bolsillo”. */
export function quotedActivePocket(ctx: DecisionContext): string {
  const name = ctx.activePocketName?.trim();
  return name ? `«${name}»` : "este bolsillo";
}

/** “en «Mi bolsillo»” / “en este bolsillo”. */
export function inActivePocket(ctx: DecisionContext): string {
  const name = ctx.activePocketName?.trim();
  return name ? `en «${name}»` : "en este bolsillo";
}

/** «Ocio», «Viaje» y «Casa» — for recommendations. */
export function formatPocketNamesList(names: string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return "tus bolsillos";
  if (clean.length === 1) return `«${clean[0]}»`;
  if (clean.length === 2) return `«${clean[0]}» y «${clean[1]}»`;
  const head = clean
    .slice(0, -1)
    .map((n) => `«${n}»`)
    .join(", ");
  return `${head} y «${clean[clean.length - 1]}»`;
}
