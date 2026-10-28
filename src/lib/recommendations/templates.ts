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
    case "welcome_panel": {
      const couple = Boolean(facts.isCoupleUi);
      return {
        title: "Bienvenido a tus notas",
        body: couple
          ? "Aquí irán apareciendo avisos, empujones y logros a medida que registremos ingresos, gastos y ahorro juntos. Hoy es solo el punto de partida: sin historial aún no hay urgencias que inventar."
          : "Aquí irán apareciendo avisos, empujones y logros a medida que registres ingresos, gastos y ahorro. Hoy es solo el punto de partida: sin historial aún no hay urgencias que inventar.",
        why: [
          "Aún no hay movimientos en tu espacio",
          couple
            ? "Las notas crecerán con lo que compartáis"
            : "Las notas crecerán con lo que registres",
        ],
        impact:
          "Con el tiempo verás propuestas ancladas a tu realidad — qué mirar, qué apartar, qué celebrar — sin chat ni presión.",
        source: "template",
      };
    }
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
        body: "Aún no hay cuentas visibles. Cuando las registres, podremos contarte con más claridad qué apartar o revisar.",
        why: [`Bolsillos activos: ${num(facts, "fundsCount")}`],
        impact:
          "Con cuentas a la vista, las notas y el mapa cobran sentido.",
        source: "template",
      };
    case "spend_pace_nudge":
      return {
        title: "El ritmo de gasto pide un vistazo",
        body: `Este mes llevas ${num(facts, "monthSpent")} € gastados frente a ${num(facts, "accountsVisibleLiquidity")} € visibles en cuentas. No es una alarma: un pequeño ajuste ahora suele bastar.`,
        why: [
          `Gastado este mes: ${num(facts, "monthSpent")} €`,
          `Liquidez visible: ${num(facts, "accountsVisibleLiquidity")} €`,
        ],
        impact:
          "Revisar a tiempo protege el margen sin dramatizar.",
        source: "template",
      };
    case "savings_milestone":
      return {
        title: `¡Habéis llegado a ${num(facts, "milestone")} € de ahorro!`,
        body: `El bote de ahorro está en ${num(facts, "savingsBalance")} €. Es un hito real: celebrarlo refuerza el hábito sin presión.`,
        why: [
          `Umbral alcanzado: ${num(facts, "milestone")} €`,
          `Saldo de ahorro: ${num(facts, "savingsBalance")} €`,
        ],
        impact:
          "Reconocer el progreso ayuda a mantener el ritmo con más calma.",
        source: "template",
      };
    case "month_pulse_summary": {
      const couple = Boolean(facts.isCoupleUi);
      const verb = couple ? "lleváis" : "llevas";
      return {
        title: couple ? "Pulso del mes juntos" : "Pulso del mes",
        body: `Este mes ${verb} ${num(facts, "monthSpent")} € en gastos, ${num(facts, "accountsVisibleLiquidity")} € visibles en cuentas y ${num(facts, "savingsBalance")} € en ahorro, con ${num(facts, "ledgerMovementCount")} movimientos registrados.`,
        why: [
          `Gastado: ${num(facts, "monthSpent")} €`,
          `Cuentas: ${num(facts, "accountsVisibleLiquidity")} €`,
          `Ahorro: ${num(facts, "savingsBalance")} €`,
        ],
        impact:
          "Un resumen breve ayuda a decidir el siguiente paso sin abrumar.",
        source: "template",
      };
    }
    default:
      return {
        title: "Nota",
        body: "Hay algo útil a partir de tu situación actual.",
        why: [],
        impact: null,
        source: "template",
      };
  }
}
