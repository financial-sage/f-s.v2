export type AppCurrency =
  | "EUR"
  | "COP"
  | "USD"
  | "GBP"
  | "MXN"
  | "CHF"
  | "BRL";

export type CurrencyMeta = {
  code: AppCurrency;
  locale: string;
  label: string;
  /** ISO 3166-1 alpha-2 for flag rendering (Windows has no emoji flags). */
  country: "ES" | "CO" | "US" | "GB" | "MX" | "CH" | "BR";
  symbol: string;
  /** Where the symbol sits relative to the amount in UI (es-ES: after). */
  symbolPosition: "before" | "after";
};

export const CURRENCY_STORAGE_KEY = "fsage:currency";
/** Cookie mirror so server actions / Gemini can read locale without DB. */
export const CURRENCY_COOKIE_KEY = "fsage_currency";
export const CURRENCY_CHANGE_EVENT = "fsage:currency";

export const DEFAULT_CURRENCY: AppCurrency = "EUR";

export const CURRENCIES: Record<AppCurrency, CurrencyMeta> = {
  EUR: {
    code: "EUR",
    locale: "es-ES",
    label: "Euro",
    country: "ES",
    symbol: "€",
    symbolPosition: "after",
  },
  COP: {
    code: "COP",
    locale: "es-CO",
    label: "Peso colombiano",
    country: "CO",
    symbol: "$",
    symbolPosition: "before",
  },
  USD: {
    code: "USD",
    locale: "en-US",
    label: "Dólar estadounidense",
    country: "US",
    symbol: "$",
    symbolPosition: "before",
  },
  GBP: {
    code: "GBP",
    locale: "en-GB",
    label: "Libra esterlina",
    country: "GB",
    symbol: "£",
    symbolPosition: "before",
  },
  MXN: {
    code: "MXN",
    locale: "es-MX",
    label: "Peso mexicano",
    country: "MX",
    symbol: "$",
    symbolPosition: "before",
  },
  CHF: {
    code: "CHF",
    locale: "de-CH",
    label: "Franco suizo",
    country: "CH",
    symbol: "CHF",
    symbolPosition: "before",
  },
  BRL: {
    code: "BRL",
    locale: "pt-BR",
    label: "Real brasileño",
    country: "BR",
    symbol: "R$",
    symbolPosition: "before",
  },
};

/** Currencies offered when creating/editing an investment. */
export const INVESTMENT_CURRENCY_OPTIONS = Object.values(CURRENCIES);

/** Household preference picker (profile) — keep the core three first. */
export const CURRENCY_OPTIONS: CurrencyMeta[] = [
  CURRENCIES.EUR,
  CURRENCIES.COP,
  CURRENCIES.USD,
];

export function isAppCurrency(value: unknown): value is AppCurrency {
  return (
    value === "EUR" ||
    value === "COP" ||
    value === "USD" ||
    value === "GBP" ||
    value === "MXN" ||
    value === "CHF" ||
    value === "BRL"
  );
}

export function getCurrencyMeta(code: AppCurrency = DEFAULT_CURRENCY): CurrencyMeta {
  return CURRENCIES[code] ?? CURRENCIES[DEFAULT_CURRENCY];
}

export function readStoredCurrency(): AppCurrency {
  if (typeof window === "undefined") return DEFAULT_CURRENCY;
  try {
    const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    return isAppCurrency(stored) ? stored : DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export function writeStoredCurrency(code: AppCurrency) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, code);
  } catch {
    // ignore
  }
  try {
    document.cookie = `${CURRENCY_COOKIE_KEY}=${code}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CURRENCY_CHANGE_EVENT));
}

/** Also seed cookie when reading from localStorage (first visit after deploy). */
export function ensureCurrencyCookie(code: AppCurrency = readStoredCurrency()) {
  if (typeof window === "undefined") return;
  try {
    document.cookie = `${CURRENCY_COOKIE_KEY}=${code}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // ignore
  }
}

function normalizeMoney(value: number) {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  return Object.is(rounded, -0) || Math.abs(rounded) < 0.005 ? 0 : rounded;
}

/** Round like the rest of the app (2 dp), then format with the selected locale. */
export function formatCurrency(
  value: number,
  currency: AppCurrency = DEFAULT_CURRENCY,
) {
  const meta = getCurrencyMeta(currency);
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.code,
  }).format(normalizeMoney(value));
}

export type CurrencyFormatPart = {
  type: Intl.NumberFormatPartTypes;
  value: string;
};

/** Parts for rendering smaller decimals in UI. */
export function formatCurrencyParts(
  value: number,
  currency: AppCurrency = DEFAULT_CURRENCY,
): CurrencyFormatPart[] {
  const meta = getCurrencyMeta(currency);
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.code,
  }).formatToParts(normalizeMoney(value));
}

/**
 * Split an already-formatted money string so the fractional digits can be
 * rendered smaller (e.g. "1.234,56 €" → integer + ",56" + " €").
 */
export function splitFormattedMoney(formatted: string): {
  head: string;
  fraction: string;
  tail: string;
} {
  const match = formatted.match(/^(.*?)([.,]\d{1,2})(.*)$/);
  if (!match) return { head: formatted, fraction: "", tail: "" };
  return { head: match[1], fraction: match[2], tail: match[3] };
}

export function currencyDisplayLabel(code: AppCurrency = DEFAULT_CURRENCY) {
  const meta = getCurrencyMeta(code);
  return `${meta.code} · ${meta.symbol}`;
}
