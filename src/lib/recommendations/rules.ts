import type {
  RecommendationCandidate,
  RecommendationContext,
  RecommendationKind,
} from "./types";
import { PRIORITY_RANK } from "./types";

const MAX_ACTIVE = 3;

/** Savings celebration thresholds (EUR-equivalent units in domain numbers). */
export const SAVINGS_MILESTONES = [100, 500, 1000] as const;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function withKind(
  candidate: Omit<RecommendationCandidate, "kind"> & {
    kind?: RecommendationKind;
  }
): RecommendationCandidate {
  return {
    kind: candidate.kind ?? "recommendation",
    ruleId: candidate.ruleId,
    priority: candidate.priority,
    facts: candidate.facts,
    ctaHref: candidate.ctaHref,
    ctaLabel: candidate.ctaLabel,
  };
}

/** No ledger yet — just onboarded or empty space. */
export function isEarlyHousehold(ctx: RecommendationContext): boolean {
  return ctx.ledgerMovementCount === 0 && round2(ctx.monthSpent) === 0;
}

/**
 * Highest savings milestone the household has reached (or null).
 */
export function reachedSavingsMilestone(
  savingsBalance: number
): number | null {
  const bal = round2(savingsBalance);
  let hit: number | null = null;
  for (const m of SAVINGS_MILESTONES) {
    if (bal >= m) hit = m;
  }
  return hit;
}

/**
 * Domain rules pick candidates (ADR-0009 option A + ADR-0011 kinds).
 * Order = priority within the returned set.
 */
export function selectRecommendationCandidates(
  ctx: RecommendationContext
): RecommendationCandidate[] {
  const out: RecommendationCandidate[] = [];
  const liquidity = round2(ctx.accountsVisibleLiquidity);
  const spent = round2(ctx.monthSpent);
  const savings = round2(ctx.savingsBalance);
  const pocketsTotal = round2(
    ctx.pockets.reduce((sum, p) => sum + p.balance, 0)
  );
  const early = isEarlyHousehold(ctx);

  // 0) Welcome — first recommendation while the space has no history yet.
  if (early) {
    out.push(
      withKind({
        ruleId: "welcome_panel",
        kind: "recommendation",
        priority: "educational",
        facts: {
          memberCount: ctx.memberCount,
          isCoupleUi: ctx.isCoupleUi,
          hasVisibleAccounts: ctx.hasVisibleAccounts,
          fundsCount: ctx.fundsCount,
          ledgerMovementCount: ctx.ledgerMovementCount,
        },
        ctaHref: "/accounts",
        ctaLabel: ctx.hasVisibleAccounts
          ? "Ver mis cuentas"
          : "Registrar una cuenta",
      })
    );
    return out.slice(0, MAX_ACTIVE);
  }

  // 1) Account / liquidity strained
  if (
    ctx.hasVisibleAccounts &&
    (liquidity < 0 || (liquidity === 0 && ctx.ledgerMovementCount > 0))
  ) {
    out.push(
      withKind({
        ruleId: "account_strained",
        kind: "alert",
        priority: liquidity < 0 ? "critical" : "important",
        facts: {
          accountsVisibleLiquidity: liquidity,
          negativePocketCount: ctx.negativePocketCount,
          monthSpent: spent,
          pocketsTotal,
        },
        ctaHref: "/accounts",
        ctaLabel: "Revisar cuentas",
      })
    );
  }

  // 2) Suggest saving when there is room and little/no savings progress
  const roomToSave =
    ctx.hasVisibleAccounts &&
    liquidity > 50 &&
    ctx.negativePocketCount === 0 &&
    spent >= 0;
  const savingsThin = !ctx.hasSavingsFund || savings < 20;
  if (roomToSave && savingsThin) {
    out.push(
      withKind({
        ruleId: "suggest_savings",
        kind: "recommendation",
        priority: "opportunity",
        facts: {
          accountsVisibleLiquidity: liquidity,
          savingsBalance: savings,
          hasSavingsFund: ctx.hasSavingsFund,
          monthSpent: spent,
        },
        ctaHref: "/savings",
        ctaLabel: "Ir a ahorro",
      })
    );
  }

  // 3) Spend pace / strained pockets → alert-ish review
  if (ctx.negativePocketCount >= 2 || (spent > 0 && pocketsTotal < 0)) {
    out.push(
      withKind({
        ruleId: "review_spend_pace",
        kind: "alert",
        priority: "important",
        facts: {
          negativePocketCount: ctx.negativePocketCount,
          monthSpent: spent,
          pocketsTotal,
        },
        ctaHref: "/history",
        ctaLabel: "Revisar gastos del mes",
      })
    );
  }

  // 4) Organize accounts if none visible
  if (!ctx.hasVisibleAccounts) {
    out.push(
      withKind({
        ruleId: "organize_accounts",
        kind: "recommendation",
        priority: "educational",
        facts: {
          fundsCount: ctx.fundsCount,
          memberCount: ctx.memberCount,
        },
        ctaHref: "/accounts",
        ctaLabel: "Abrir cuentas",
      })
    );
  }

  // 5) Soft nudge: spend high vs visible liquidity (without negative pockets crisis)
  if (
    ctx.hasVisibleAccounts &&
    spent > 0 &&
    liquidity > 0 &&
    spent > liquidity * 0.6 &&
    ctx.negativePocketCount < 2
  ) {
    out.push(
      withKind({
        ruleId: "spend_pace_nudge",
        kind: "nudge",
        priority: "opportunity",
        facts: {
          monthSpent: spent,
          accountsVisibleLiquidity: liquidity,
          spendToLiquidityRatio: round2(spent / Math.max(liquidity, 1)),
        },
        ctaHref: "/history",
        ctaLabel: "Ver movimientos",
      })
    );
  }

  // 6) Celebration: savings milestone
  const milestone = reachedSavingsMilestone(savings);
  if (ctx.hasSavingsFund && milestone != null) {
    out.push(
      withKind({
        ruleId: "savings_milestone",
        kind: "celebration",
        priority: "educational",
        facts: {
          savingsBalance: savings,
          milestone,
        },
        ctaHref: "/savings",
        ctaLabel: "Ver ahorro",
      })
    );
  }

  // 7) Short month pulse summary when there is enough activity
  if (ctx.ledgerMovementCount >= 5 && spent >= 0) {
    out.push(
      withKind({
        ruleId: "month_pulse_summary",
        kind: "summary",
        priority: "educational",
        facts: {
          monthSpent: spent,
          accountsVisibleLiquidity: liquidity,
          savingsBalance: savings,
          ledgerMovementCount: ctx.ledgerMovementCount,
          pocketsTotal,
          isCoupleUi: ctx.isCoupleUi,
        },
        ctaHref: "/guidance",
        ctaLabel: "Ver orientación",
      })
    );
  }

  return [...out]
    .sort(
      (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    )
    .slice(0, MAX_ACTIVE);
}
