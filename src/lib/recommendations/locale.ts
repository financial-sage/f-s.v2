import { cookies } from "next/headers";
import {
  CURRENCY_COOKIE_KEY,
  DEFAULT_CURRENCY,
  getCurrencyMeta,
  isAppCurrency,
  type AppCurrency,
  type CurrencyMeta,
} from "@/lib/currency";

export type RecommendationSpeech = {
  currency: AppCurrency;
  meta: CurrencyMeta;
  /** Injected into the Gemini system prompt. */
  promptLocaleBlock: string;
};

function speechFor(currency: AppCurrency): RecommendationSpeech {
  const meta = getCurrencyMeta(currency);

  if (currency === "EUR") {
    return {
      currency,
      meta,
      promptLocaleBlock: `Variedad: español de España (es-ES).
Trato: usad "vosotros" en pareja/hogar (revisad, preocupéis, mirad) y "tú" si el tono es individual.
Léxico: "cuenta", "bolsillo", "ahorro", "gasto"; moneda en euros (€).
Evitad formas latinoamericanas (ustedes como trato de ustedes, "plata" como sinónimo principal de dinero).`,
    };
  }

  if (currency === "COP") {
    return {
      currency,
      meta,
      promptLocaleBlock: `Variedad: español de Colombia (es-CO).
Trato: "ustedes" o "tú" natural colombiano (revisen, no se preocupen, miren); no uses vosotros.
Léxico cercano y claro; moneda en pesos colombianos ($ / COP).
Evitad español de España (vosotros, "revisad", "preocupéis").`,
    };
  }

  // USD — español latino neutro (producto en español)
  return {
    currency,
    meta,
    promptLocaleBlock: `Variedad: español latino neutro.
Trato: "ustedes"/"tú"; no uses vosotros.
Moneda en dólares ($ / USD).
Evitad marcado español de España (vosotros) y regionalismos fuertes.`,
  };
}

export async function getRecommendationSpeech(): Promise<RecommendationSpeech> {
  try {
    const jar = await cookies();
    const raw = jar.get(CURRENCY_COOKIE_KEY)?.value;
    const currency = isAppCurrency(raw) ? raw : DEFAULT_CURRENCY;
    return speechFor(currency);
  } catch {
    return speechFor(DEFAULT_CURRENCY);
  }
}
