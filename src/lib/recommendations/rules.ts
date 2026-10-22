import type {
  RecommendationCandidate,
  RecommendationContext,
} from "./types";

const MAX_ACTIVE = 3;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Domain rules pick candidates (ADR-0009 option A). Order = priority.
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

  // 1) Account / liquidity strained
  if (ctx.hasVisibleAccounts && (liquidity < 0 || liquidity === 0)) {
    out.push({
      ruleId: "account_strained",
      priority: liquidity < 0 ? "critical" : "important",
      facts: {
        accountsVisibleLiquidity: liquidity,
        negativePocketCount: ctx.negativePocketCount,
        monthSpent: spent,
        pocketsTotal,
      },
      ctaHref: "/accounts",
      ctaLabel: "Revisar cuentas",
    });
  }

  // 2) Suggest saving when there is room and little/no savings progress
  const roomToSave =
    ctx.hasVisibleAccounts &&
    liquidity > 50 &&
    ctx.negativePocketCount === 0 &&
    spent >= 0;
  const savingsThin = !ctx.hasSavingsFund || savings < 20;
  if (roomToSave && savingsThin) {
    out.push({
      ruleId: "suggest_savings",
      priority: "opportunity",
      facts: {
        accountsVisibleLiquidity: liquidity,
        savingsBalance: savings,
        hasSavingsFund: ctx.hasSavingsFund,
        monthSpent: spent,
      },
      ctaHref: "/savings",
      ctaLabel: "Ir a ahorro",
    });
  }

  // 3) Spend pace / strained pockets
  if (ctx.negativePocketCount >= 2 || (spent > 0 && pocketsTotal < 0)) {
    out.push({
      ruleId: "review_spend_pace",
      priority: "important",
      facts: {
        negativePocketCount: ctx.negativePocketCount,
        monthSpent: spent,
        pocketsTotal,
      },
      ctaHref: "/history",
      ctaLabel: "Revisar gastos del mes",
    });
  }

  // 4) Organize accounts if none visible
  if (!ctx.hasVisibleAccounts) {
    out.push({
      ruleId: "organize_accounts",
      priority: "educational",
      facts: {
        fundsCount: ctx.fundsCount,
        memberCount: ctx.memberCount,
      },
      ctaHref: "/accounts",
      ctaLabel: "Abrir cuentas",
    });
  }

  return out.slice(0, MAX_ACTIVE);
}
