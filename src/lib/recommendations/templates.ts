import type {
  RecommendationCandidate,
  RecommendationCopy,
  RecommendationFacts,
} from "./types";

function num(facts: RecommendationFacts, key: string): string {
  const v = facts[key];
  if (typeof v === "number") {
    return v.toLocaleString("es-ES", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }
  return String(v ?? "—");
}

export function templateCopyForCandidate(
  candidate: RecommendationCandidate
): RecommendationCopy {
  const { ruleId, facts } = candidate;

  switch (ruleId) {
    case "account_strained": {
      const liq = Number(facts.accountsVisibleLiquidity) || 0;
      return {
        title: liq < 0 ? "Tu cuenta pide atención" : "Cuenta en cero",
        body:
          liq < 0
            ? `La liquidez visible está en ${num(facts, "accountsVisibleLiquidity")} €. Conviene revisar movimientos y pausar lo no esencial hasta recuperar colchón.`
            : `La cuenta está en 0 €. El dinero puede estar en bolsillos; mira el mapa y decide el próximo paso con calma.`,
        why: [
          `Cuentas: ${num(facts, "accountsVisibleLiquidity")} €`,
          `Bolsillos bajo cero: ${num(facts, "negativePocketCount")}`,
        ],
        impact:
          "Ordenar la liquidez reduce sorpresas y deja margen para decidir sin prisa.",
        source: "template",
      };
    }
    case "suggest_savings":
      return {
        title: "Buen momento para apartar un poco",
        body: `Hay ${num(facts, "accountsVisibleLiquidity")} € visibles en cuentas y el ahorro está en ${num(facts, "savingsBalance")} €. Apartar una cantidad pequeña ahora construye colchón sin drama.`,
        why: [
          `Cuentas: ${num(facts, "accountsVisibleLiquidity")} €`,
          `Ahorro: ${num(facts, "savingsBalance")} €`,
        ],
        impact:
          "Un aporte pequeño y constante suele pesar más que un gesto grande puntual.",
        source: "template",
      };
    case "review_spend_pace":
      return {
        title: "Revisa el ritmo de gastos",
        body: `Este mes llevas ${num(facts, "monthSpent")} € en gastos reales y hay ${num(facts, "negativePocketCount")} bolsillo(s) bajo cero. Conviene mirar en qué se fue el dinero y priorizar lo imprescindible.`,
        why: [
          `Gastado este mes: ${num(facts, "monthSpent")} €`,
          `Bolsillos bajo cero: ${num(facts, "negativePocketCount")}`,
        ],
        impact:
          "Ajustar el ritmo ahora evita llegar al cierre con menos margen del deseado.",
        source: "template",
      };
    case "organize_accounts":
      return {
        title: "Registra dónde está el dinero",
        body: "Aún no hay cuentas visibles. Cuando las registres, podremos recomendarte con más claridad qué apartar o revisar.",
        why: [`Bolsillos activos: ${num(facts, "fundsCount")}`],
        impact:
          "Con cuentas a la vista, las recomendaciones y el mapa cobran sentido.",
        source: "template",
      };
    default:
      return {
        title: "Sugerencia",
        body: "Hay una acción posible a partir de tu situación actual.",
        why: [],
        impact: null,
        source: "template",
      };
  }
}
