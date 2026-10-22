"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CURRENCY_CHANGE_EVENT,
  CURRENCY_STORAGE_KEY,
  DEFAULT_CURRENCY,
  ensureCurrencyCookie,
  formatCurrency as formatCurrencyValue,
  getCurrencyMeta,
  readStoredCurrency,
  writeStoredCurrency,
  type AppCurrency,
} from "@/lib/currency";

export function useCurrency() {
  const [currency, setCurrencyState] = useState<AppCurrency>(DEFAULT_CURRENCY);

  useEffect(() => {
    const stored = readStoredCurrency();
    setCurrencyState(stored);
    ensureCurrencyCookie(stored);

    const sync = () => setCurrencyState(readStoredCurrency());
    const onStorage = (event: StorageEvent) => {
      if (event.key === CURRENCY_STORAGE_KEY || event.key === null) sync();
    };

    window.addEventListener(CURRENCY_CHANGE_EVENT, sync);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(CURRENCY_CHANGE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setCurrency = useCallback((next: AppCurrency) => {
    writeStoredCurrency(next);
    setCurrencyState(next);
  }, []);

  const format = useCallback(
    (value: number) => formatCurrencyValue(value, currency),
    [currency],
  );

  return {
    currency,
    setCurrency,
    /** Plain string — use for messages / aria. Prefer FormattedCurrency in UI. */
    format,
    meta: getCurrencyMeta(currency),
  };
}
