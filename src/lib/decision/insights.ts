import type { DecisionContext, InsightConfidence } from "./context";
import {
  formatPocketNamesList,
  inActivePocket,
  quotedActivePocket,
} from "./context";

export interface GuidanceHighlight {
  label: string;
  value: string;
}

export interface GuidanceInsight {
  id: string;
  title: string;
  /** Short hook for the home modal (idea + few numbers). */
  summary: string;
  /** Up to ~3 key figures for the modal; full breakdown lives on /guidance. */
  highlights: GuidanceHighlight[];
  /** One-line framing for /guidance — no number dump (mapa carries figures). */
  pageLead: string;
  confidence: InsightConfidence;
  cta?: { href: string; label: string };
}

export interface GuidanceRecommendation {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}

const DETAIL_CTA = {
  href: "/guidance",
  label: "¿Vemos una orientación más detallada?",
} as const;

function formatAmount(value: number): string {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function totalPocketsBalance(ctx: DecisionContext): number {
  if (ctx.pockets.length === 0) return ctx.pocketOrHeroBalance;
  return (
    Math.round(
      ctx.pockets.reduce((sum, p) => sum + (Number(p.balance) || 0), 0) * 100
    ) / 100
  );
}

function compactHighlights(
  items: Array<GuidanceHighlight | null | false | undefined>
): GuidanceHighlight[] {
  return items.filter(Boolean).slice(0, 3) as GuidanceHighlight[];
}

function negativePockets(ctx: DecisionContext) {
  return ctx.pockets.filter((p) => p.balance < 0);
}

function hasNegativeBalance(ctx: DecisionContext): boolean {
  if (ctx.pocketOrHeroBalance < 0) return true;
  if (ctx.accountsVisibleLiquidity < 0) return true;
  return negativePockets(ctx).length > 0;
}

/**
 * Priority (business-rules §19–23 + saldo negativo).
 * Modal = summary + highlights. Page = pageLead + money map + recommendation.
 */
export function selectPrimaryInsight(ctx: DecisionContext): GuidanceInsight {
  const liquidity = ctx.accountsVisibleLiquidity;
  const pocket = ctx.pocketOrHeroBalance;
  const spent = ctx.monthSpent;
  const pocketRef = quotedActivePocket(ctx);
  const inPocket = inActivePocket(ctx);
  const pocketsTotal = totalPocketsBalance(ctx);
  const negatives = negativePockets(ctx);

  // Alert without alarm: negative is a fact to face calmly.
  // Prefer cuenta negativa as focus when both account and pocket are red.
  if (hasNegativeBalance(ctx)) {
    const accountNegative = liquidity < 0;
    const focusName = accountNegative
      ? "cuentas"
      : pocket < 0
        ? pocketRef
        : negatives[0]
          ? `«${negatives[0].name}»`
          : "cuentas";
    const focusValue = accountNegative
      ? liquidity
      : pocket < 0
        ? pocket
        : negatives[0]
          ? negatives[0].balance
          : liquidity;

    return {
      id: "negative-balance",
      title: accountNegative
        ? "Tu cuenta está en negativo"
        : "Hay un saldo en negativo",
      summary: accountNegative
        ? `En cuentas el saldo está en ${formatAmount(liquidity)} €. No es un juicio: es una señal para revisar movimientos y decidir cómo equilibrarlo con calma.`
        : `En ${focusName} el saldo está en ${formatAmount(focusValue)} €. No es un juicio: es una señal para ver qué lo ha dejado así y decidir el siguiente paso con calma.`,
      highlights: compactHighlights([
        { label: "Cuentas", value: `${formatAmount(liquidity)} €` },
        pocket !== 0 || negatives.length > 0
          ? {
              label: pocketRef.replaceAll("«", "").replaceAll("»", ""),
              value: `${formatAmount(pocket)} €`,
            }
          : null,
        spent > 0
          ? { label: "Gastado este mes", value: `${formatAmount(spent)} €` }
          : null,
      ]),
      pageLead: accountNegative
        ? "Abajo ves el mapa. El negativo en cuenta es real; sirve para entender el desfase y decidir el siguiente paso sin culpa."
        : liquidity > 0 && pocket < 0
          ? "Abajo ves el mapa. Hay dinero en cuenta y un bolsillo en negativo: puedes cubrirlo moviendo fondos — eso no es un gasto nuevo, es ordenar."
          : liquidity === 0 && pocket < 0
            ? "Abajo ves el mapa. Bolsillo en negativo y cuenta en cero: primero entender el gasto; luego, con un ingreso, podrás cuadrar."
            : "Abajo ves el mapa. El número en negativo es real; sirve para entender el desfase y decidir con claridad, sin prisa ni culpa.",
      confidence: "high",
      cta: { ...DETAIL_CTA },
    };
  }

  // Account exists but is empty (0): calm signal, not an alarm.
  if (ctx.hasVisibleAccounts && liquidity === 0) {
    return {
      id: "account-empty",
      title: "Tu cuenta está en cero",
      summary:
        pocket > 0
          ? `La cuenta está en 0 €. Lo que ves disponible está en ${pocketRef} (${formatAmount(pocket)} €). Conviene saberlo para no contar dos veces el mismo dinero.`
          : "La cuenta está en 0 €. No es alarma: es el punto de partida. Cuando entre un ingreso o registres un movimiento, la lectura se vuelve más útil.",
      highlights: compactHighlights([
        { label: "Cuentas", value: "0 €" },
        pocket !== 0
          ? {
              label: pocketRef.replaceAll("«", "").replaceAll("»", ""),
              value: `${formatAmount(pocket)} €`,
            }
          : null,
        spent > 0
          ? { label: "Gastado este mes", value: `${formatAmount(spent)} €` }
          : null,
      ]),
      pageLead:
        pocket > 0
          ? "Abajo el mapa: cuenta en cero y bolsillos con saldo. Así se ve dónde está realmente el dinero hoy."
          : "Abajo el mapa con lo que hay. La cuenta en cero es un hecho; el siguiente ingreso o movimiento dará más contexto.",
      confidence: "medium",
      cta: { ...DETAIL_CTA },
    };
  }

  if (!ctx.hasVisibleAccounts) {
    return {
      id: "open-accounts",
      title: "Falta un dato para explicarte mejor",
      summary: `El saldo de arriba es de ${pocketRef}. Con una cuenta podremos decirte también qué hay fuera de tus bolsillos.`,
      highlights: compactHighlights([
        { label: pocketRef.replaceAll("«", "").replaceAll("»", ""), value: `${formatAmount(pocket)} €` },
        { label: "Cuentas", value: "Sin registrar" },
      ]),
      pageLead:
        "Todavía no hay cuenta registrada. Abajo ves lo que sí sabemos de tus bolsillos; el siguiente paso es registrar dónde está el resto.",
      confidence: "medium",
      cta: { href: "/accounts", label: "Registrar una cuenta" },
    };
  }

  if (liquidity > 0 && pocket <= liquidity * 0.25) {
    return {
      id: "accounts-vs-pocket",
      title: "Tienes dinero en cuenta; falta organizarlo",
      summary: `Hay ${formatAmount(liquidity)} € en cuentas, pero ${inPocket} solo ves ${formatAmount(pocket)} €. Organizar no es gastar: es saber dónde está el dinero.`,
      highlights: compactHighlights([
        { label: "Cuentas", value: `${formatAmount(liquidity)} €` },
        spent > 0 ? { label: "Gastado este mes", value: `${formatAmount(spent)} €` } : null,
        ctx.pockets.length > 1
          ? { label: "Bolsillos", value: `${formatAmount(pocketsTotal)} €` }
          : { label: pocketRef.replaceAll("«", "").replaceAll("»", ""), value: `${formatAmount(pocket)} €` },
      ]),
      pageLead:
        "Abajo tienes el mapa: cuentas, cada bolsillo y lo gastado este mes. Sirve para ver el desajuste y decidir qué apartar.",
      confidence: "high",
      cta: { ...DETAIL_CTA },
    };
  }

  if (spent > 0 || pocket !== 0) {
    if (spent > 0) {
      return {
        id: "month-margin",
        title: "Así vas este mes",
        summary: ctx.isCoupleUi
          ? `Este mes el hogar lleva ${formatAmount(spent)} € en gastos. En ${pocketRef} quedan ${formatAmount(pocket)} € para decidir.`
          : `Has gastado ${formatAmount(spent)} € este mes. En ${pocketRef} te quedan ${formatAmount(pocket)} € para decidir.`,
        highlights: compactHighlights([
          { label: "Gastado este mes", value: `${formatAmount(spent)} €` },
          { label: pocketRef.replaceAll("«", "").replaceAll("»", ""), value: `${formatAmount(pocket)} €` },
          liquidity > 0
            ? { label: "Cuentas", value: `${formatAmount(liquidity)} €` }
            : null,
        ]),
        pageLead:
          "Aquí el detalle de dónde está el dinero y cuánto se ha movido en gastos este mes — sin repetir el resumen del inicio.",
        confidence: "high",
        cta: { ...DETAIL_CTA },
      };
    }

    return {
      id: "month-margin",
      title: "Así vas este mes",
      summary: `En ${pocketRef} tienes ${formatAmount(pocket)} €. Cuando registres gastos, podremos contrastarlos con este margen.`,
      highlights: compactHighlights([
        { label: pocketRef.replaceAll("«", "").replaceAll("»", ""), value: `${formatAmount(pocket)} €` },
        liquidity > 0
          ? { label: "Cuentas", value: `${formatAmount(liquidity)} €` }
          : null,
      ]),
      pageLead:
        "Todavía hay poco gasto registrado. Abajo ves dónde está el dinero hoy para ir organizándolo.",
      confidence: "medium",
      cta: { ...DETAIL_CTA },
    };
  }

  return {
    id: "unknown",
    title: "Todavía no hay suficiente para orientarte",
    summary:
      "Cuando registres una cuenta o algún movimiento, podremos decirte con más claridad cómo vas.",
    highlights: [],
    pageLead:
      "Faltan hechos para un mapa útil. Empieza por una cuenta o un movimiento y volvemos a leer tu realidad.",
    confidence: "unknown",
    cta: { href: "/accounts", label: "Empezar por una cuenta" },
  };
}

type MonthPhase = "early" | "mid" | "late";

function monthPhase(now: Date = new Date()): MonthPhase {
  const day = now.getDate();
  if (day <= 10) return "early";
  if (day <= 20) return "mid";
  return "late";
}

/**
 * When accounts/pockets look healthy: acknowledge progress and match tone to the month.
 * If margin is tight vs spend, encourage calm pace — never guilt.
 */
function selectWellnessRecommendation(
  ctx: DecisionContext
): GuidanceRecommendation {
  const phase = monthPhase();
  const pocketRef = quotedActivePocket(ctx);
  const pocket = ctx.pocketOrHeroBalance;
  const spent = ctx.monthSpent;
  const who = ctx.isCoupleUi ? "el hogar" : "tú";
  const youHave = ctx.isCoupleUi ? "Tenéis" : "Tienes";
  const youKeep = ctx.isCoupleUi ? "Seguid" : "Sigue";
  const tightMargin =
    spent > 0 && pocket >= 0 && pocket <= Math.max(spent * 0.35, 150);

  if (spent > 0 && tightMargin) {
    if (phase === "early") {
      return {
        title: "El mes pide ir con tiento",
        body: `Queda poco en ${pocketRef} y aún queda casi todo el mes. No es alarma: es una señal para decidir con más calma los próximos gastos.`,
        cta: { href: "/history", label: "Ver en qué se ha ido" },
      };
    }
    if (phase === "mid") {
      return {
        title: "Conviene mirar el ritmo",
        body: `A mitad de mes, ${pocketRef} va justo respecto a lo ya gastado. ${youKeep} registrando: así ${who} ve el margen real antes de comprometer más.`,
        cta: { href: "/history", label: "Ver cómo va el mes" },
      };
    }
    return {
      title: "Llegas justo al cierre",
      body: `${pocketRef} queda con poco colchón y el mes ya termina. Has llegado con los números a la vista — útil para cerrar sin sorpresas y arrancar el siguiente con más aire.`,
      cta: { href: "/history", label: "Repasar el mes" },
    };
  }

  if (spent > 0) {
    if (phase === "early") {
      return {
        title: "Buen comienzo de mes",
        body: `${youHave} margen en ${pocketRef} y el mes recién arranca. Eso es orden real: ${who} puede decidir con calma, no a ciegas.`,
        cta: { href: "/history", label: "Echar un vistazo al mes" },
      };
    }
    if (phase === "mid") {
      return {
        title: "Vas con el mes bajo control",
        body: `A mitad de camino, ${pocketRef} sigue con margen y los gastos están a la vista. ${youKeep} así: registrar lo del día a día es lo que mantiene esta claridad.`,
        cta: { href: "/history", label: "Ver cómo va el mes" },
      };
    }
    return {
      title: "Cierras el mes con claridad",
      body: `${youHave} margen en ${pocketRef} cuando el mes ya entra en su tramo final. Es una buena señal: sabes dónde está el dinero y qué se ha movido.`,
      cta: { href: "/history", label: "Repasar el mes" },
    };
  }

  if (phase === "early") {
    return {
      title: "Listo para empezar el mes",
      body: `${youHave} ${pocketRef} ordenado y el mes por delante. Cuando anotes los primeros gastos, la lectura se vuelve aún más útil.`,
      cta: { href: "/", label: "Volver al inicio" },
    };
  }
  if (phase === "mid") {
    return {
      title: "Todo en su sitio",
      body: `Cuentas y bolsillos cuadran bien a mitad de mes. Si aún no hay muchos gastos anotados, ${youKeep.toLowerCase()} registrando: así no se pierde el hilo.`,
      cta: { href: "/", label: "Volver al inicio" },
    };
  }
  return {
    title: "Mes ordenado",
    body: `${youHave} el dinero localizado en cuenta y bolsillos al final del periodo. Un cierre tranquilo: ${youKeep.toLowerCase()} con el mismo ritmo el mes que viene.`,
    cta: { href: "/", label: "Volver al inicio" },
  };
}

/**
 * Action-focused recommendation for /guidance.
 * Avoids repeating the money-map figures.
 */
export function selectPrimaryRecommendation(
  ctx: DecisionContext
): GuidanceRecommendation | null {
  const pocketNames = ctx.pockets.map((p) => p.name);
  const pocketsLabel = formatPocketNamesList(pocketNames);
  const liquidity = ctx.accountsVisibleLiquidity;
  const pocket = ctx.pocketOrHeroBalance;
  const pocketRef = quotedActivePocket(ctx);

  if (hasNegativeBalance(ctx)) {
    // Account in red first — don't suggest “cover from account” if account is empty/red.
    if (liquidity < 0) {
      return {
        title: "Equilibra la cuenta con calma",
        body: "Revisa los últimos movimientos de la cuenta y decide cómo volver al equilibrio. Es una señal, no un veredicto.",
        cta: { href: "/accounts", label: "Revisar cuentas" },
      };
    }
    if (liquidity > 0 && pocket < 0) {
      return {
        title: "Puedes cubrir el bolsillo desde la cuenta",
        body: `Hay saldo en cuentas y ${pocketRef} está en negativo. Mover dinero al bolsillo no es gastar: es cuadrar lo que ya usaste.`,
        cta: { href: "/accounts", label: "Cubrir desde cuentas" },
      };
    }
    // Pocket red + account at 0 (or no spare liquidity).
    if (pocket < 0 && liquidity === 0) {
      return {
        title: "Primero entiende el desfase",
        body: `${pocketRef} está en negativo y la cuenta en cero: no hay colchón ahí para cubrirlo ahora. Mira qué gasto lo dejó así; el próximo ingreso en cuenta te permitirá cuadrar el bolsillo sin inventar dinero.`,
        cta: { href: "/history", label: "Ver qué lo dejó así" },
      };
    }
    return {
      title: "Entiende el número en negativo",
      body: `${pocketRef} está por debajo de cero. No es un fallo personal: es información. Revisa el movimiento que lo causó y decide si esperas un ingreso o ajustas el próximo gasto.`,
      cta: { href: "/history", label: "Ver movimientos" },
    };
  }

  if (ctx.hasVisibleAccounts && liquidity === 0) {
    return {
      title: pocket > 0 ? "El dinero está en los bolsillos" : "Espera el próximo movimiento",
      body:
        pocket > 0
          ? "Con la cuenta en cero, organiza y gasta desde los bolsillos con lo que ya apartaste. Cuando entre un ingreso en cuenta, podrás volver a repartir."
          : "Cuando registres un ingreso en la cuenta o un gasto, podremos orientarte con más detalle.",
      cta:
        pocket > 0
          ? { href: "/history", label: "Ver movimientos" }
          : { href: "/accounts", label: "Ir a cuentas" },
    };
  }

  if (!ctx.hasVisibleAccounts) {
    return {
      title: "Registra una cuenta",
      body: "Así podremos separar lo del banco de lo que ya apartaste en bolsillos.",
      cta: { href: "/accounts", label: "Registrar una cuenta" },
    };
  }

  // Money in accounts, little in the active pocket → organize.
  if (liquidity > 0 && pocket <= liquidity * 0.25) {
    return {
      title: "Organiza dónde está tu dinero",
      body:
        pocketNames.length > 1
          ? `Reparte en ${pocketsLabel} lo que ya sabes que vas a usar este mes. No es un gasto: es ordenar.`
          : "Reparte en bolsillos lo del mes. No es un gasto: es ordenar.",
      cta: { href: "/accounts", label: "Organizar desde cuentas" },
    };
  }

  // Healthy picture → acknowledge + tone by moment in the month.
  if (liquidity > 0 || pocket > 0 || ctx.monthSpent > 0) {
    return selectWellnessRecommendation(ctx);
  }

  return {
    title: "Sigue registrando movimientos",
    body: "Con cada gasto o ingreso, la orientación se acerca más a tu día a día.",
    cta: { href: "/history", label: "Ver movimientos" },
  };
}
