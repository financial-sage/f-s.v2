import type { DecisionContext, InsightConfidence } from "./context";

export interface GuidanceInsight {
  id: string;
  title: string;
  body: string;
  why: string[];
  confidence: InsightConfidence;
  cta?: { href: string; label: string };
}

function formatAmount(value: number): string {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Priority (business-rules §19–23):
 * 1. No visible accounts
 * 2. Accounts liquidity vs low pocket
 * 3. Month spent + pocket margin
 * 4. Unknown fallback
 */
export function selectPrimaryInsight(ctx: DecisionContext): GuidanceInsight {
  const liquidity = ctx.accountsVisibleLiquidity;
  const pocket = ctx.pocketOrHeroBalance;
  const spent = ctx.monthSpent;

  if (!ctx.hasVisibleAccounts) {
    return {
      id: "open-accounts",
      title: "Aún no vemos tus cuentas",
      body: "Cuando registres dónde está tu dinero (cuentas), podremos explicar mejor tu liquidez y separarla de lo que ya organizaste en bolsillos.",
      why: [
        "No hay cuentas visibles en tu espacio ahora mismo.",
        "El saldo del inicio es el de tu bolsillo, no una cuenta bancaria.",
      ],
      confidence: "medium",
      cta: { href: "/accounts", label: "Abrir cuentas" },
    };
  }

  if (liquidity > 0 && pocket <= liquidity * 0.25) {
    return {
      id: "accounts-vs-pocket",
      title: "Cuentas y bolsillos son cosas distintas",
      body: "En cuentas tienes liquidez registrada; en el inicio ves lo que ya organizaste en bolsillos. Mover dinero entre ambos es una transferencia, no un gasto.",
      why: [
        `Liquidez visible en cuentas: ${formatAmount(liquidity)}.`,
        `Saldo del bolsillo / hero: ${formatAmount(pocket)}.`,
      ],
      confidence: "high",
      cta: { href: "/accounts", label: "Ver cuentas" },
    };
  }

  if (spent > 0 || pocket !== 0) {
    const who = ctx.isCoupleUi ? "este mes en el hogar" : "este mes";
    return {
      id: "month-margin",
      title: "Tu margen de decisión, en pocas palabras",
      body:
        spent > 0
          ? `Has registrado ${formatAmount(spent)} en movimientos ${who}. El saldo del bolsillo que ves arriba es lo disponible para decidir en ese espacio — no es un veredicto, solo un punto de partida.`
          : `Tienes ${formatAmount(pocket)} en el bolsillo activo. Cuando registres movimientos, podremos contrastar mejor lo comprometido con tu margen.`,
      why: [
        `Saldo bolsillo / hero: ${formatAmount(pocket)}.`,
        spent > 0
          ? `Movimientos del periodo (gasto registrado): ${formatAmount(spent)}.`
          : "Aún no hay gasto del periodo en el snapshot.",
        ctx.hasVisibleAccounts
          ? `Liquidez visible en cuentas: ${formatAmount(liquidity)}.`
          : "Sin liquidez de cuentas en el snapshot.",
      ],
      confidence: spent > 0 ? "high" : "medium",
      cta: { href: "/history", label: "Ver movimientos" },
    };
  }

  return {
    id: "unknown",
    title: "Aún no sabemos lo suficiente",
    body: "Cuando registres cuentas o movimientos, podremos explicarte con más claridad cómo estás y qué margen tienes para decidir.",
    why: [
      "Faltan hechos suficientes en el snapshot actual.",
      "Preferimos decir “aún no sabemos” antes que inventar un número.",
    ],
    confidence: "unknown",
    cta: { href: "/accounts", label: "Empezar por cuentas" },
  };
}
