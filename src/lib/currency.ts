export type AppCurrency = "EUR" | "COP" | "USD";

export type CurrencyMeta = {
  code: AppCurrency;
  locale: string;
  label: string;
  /** ISO 3166-1 alpha-2 for flag rendering (Windows has no emoji flags). */
  country: "ES" | "CO" | "US";
  symbol: string;
  /** Where the symbol sits relative to the amount in UI (es-ES: after). */
  symbolPosition: "before" | "after";
};

export const CURRENCY_STORAGE_KEY = "fsage:currency";
export const CURRENCY_CHANGE_EVENT = "fsage:currency";

export const DEFAULT_CURRENCY: AppCurrency = "EUR";

export const CURRENCIES: Record<AppCurrency, CurrencyMeta> = {
  EUR: {
    code: "EUR",
    locale: "es-ES",
    label: "España",
    country: "ES",
    symbol: "€",
    symbolPosition: "after",
  },
  COP: {
    code: "COP",
    locale: "es-CO",
    label: "Colombia",
    country: "CO",
    symbol: "$",
    symbolPosition: "before",
  },
  USD: {
    code: "USD",
    locale: "en-US",
    label: "Estados Unidos",
    country: "US",
    symbol: "$",
    symbolPosition: "before",
  },
};

export const CURRENCY_OPTIONS = Object.values(CURRENCIES);

export function isAppCurrency(value: unknown): value is AppCurrency {
  return value === "EUR" || value === "COP" || value === "USD";
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
  window.dispatchEvent(new Event(CURRENCY_CHANGE_EVENT));
}

/** Round like the rest of the app (2 dp), then format with the selected locale. */
export function formatCurrency(
  value: number,
  currency: AppCurrency = DEFAULT_CURRENCY,
) {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  const normalized =
    Object.is(rounded, -0) || Math.abs(rounded) < 0.005 ? 0 : rounded;
  const meta = getCurrencyMeta(currency);

  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.code,
  }).format(normalized);
}

export function currencyDisplayLabel(code: AppCurrency = DEFAULT_CURRENCY) {
  const meta = getCurrencyMeta(code);
  return `${meta.country} ${meta.symbol}`;
}
