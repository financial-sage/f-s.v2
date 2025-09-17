"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  locale: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'Dólar Estadounidense', symbol: '$', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'es-ES' },
  { code: 'COP', name: 'Peso Colombiano', symbol: '$', locale: 'es-CO' },
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$', locale: 'es-MX' },
  { code: 'ARS', name: 'Peso Argentino', symbol: '$', locale: 'es-AR' },
  { code: 'CLP', name: 'Peso Chileno', symbol: '$', locale: 'es-CL' },
  { code: 'PEN', name: 'Sol Peruano', symbol: 'S/', locale: 'es-PE' },
  { code: 'BRL', name: 'Real Brasileño', symbol: 'R$', locale: 'pt-BR' },
];

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatAmount: (amount: number, showSymbol?: boolean) => string;
  formatAmountWithType: (amount: number, type: 'income' | 'expense') => string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

interface CurrencyProviderProps {
  children: ReactNode;
}

export function CurrencyProvider({ children }: CurrencyProviderProps) {
  const [currency, setCurrencyState] = useState<Currency>(CURRENCIES[0]); // USD por defecto

  // Cargar moneda guardada al iniciar
  useEffect(() => {
    const savedCurrency = localStorage.getItem('financial-sage-currency');
    if (savedCurrency) {
      try {
        const parsed = JSON.parse(savedCurrency);
        const foundCurrency = CURRENCIES.find(c => c.code === parsed.code);
        if (foundCurrency) {
          setCurrencyState(foundCurrency);
        }
      } catch (error) {
        console.error('Error loading saved currency:', error);
      }
    }
  }, []);

  // Guardar moneda cuando cambie
  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('financial-sage-currency', JSON.stringify(newCurrency));
  };

  // Formatear cantidad con la moneda actual
  const formatAmount = (amount: number, showSymbol: boolean = true): string => {
    if (!showSymbol) {
      return new Intl.NumberFormat(currency.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    }

    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Formatear cantidad con tipo (ingreso/gasto)
  const formatAmountWithType = (amount: number, type: 'income' | 'expense'): string => {
    const formattedAmount = formatAmount(amount);
    return type === 'income' ? `+ ${formattedAmount}` : `- ${formattedAmount}`;
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      formatAmount,
      formatAmountWithType,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
