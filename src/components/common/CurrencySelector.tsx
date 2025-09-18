"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useCurrency, CURRENCIES, Currency } from '@/src/contexts/CurrencyContext';
import styles from '@/scss/modules/CurrencySelector.module.scss';

export default function CurrencySelector() {
  const { currency, setCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCurrencySelect = (selectedCurrency: Currency) => {
    setCurrency(selectedCurrency);
    setIsOpen(false);
  };

  return (
    <div className={styles.currencySelector} ref={dropdownRef}>
      <button 
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        title="Cambiar moneda"
      >
        <span className={styles.symbol}>{currency.symbol}</span>
        <span className={styles.code}>{currency.code}</span>
        <svg 
          className={`${styles.arrow} ${isOpen ? styles.open : ''}`}
          width="8" 
          height="8" 
          viewBox="0 0 12 12"
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            Seleccionar Moneda
          </div>
          <div className={styles.list}>
            {CURRENCIES.map((curr) => (
              <button
                key={curr.code}
                className={`${styles.option} ${curr.code === currency.code ? styles.active : ''}`}
                onClick={() => handleCurrencySelect(curr)}
              >
                <span className={styles.currencySymbol}>{curr.symbol}</span>
                <div className={styles.currencyInfo}>
                  <span className={styles.currencyCode}>{curr.code}</span>
                  <span className={styles.currencyName}>{curr.name}</span>
                </div>
                {curr.code === currency.code && (
                  <svg className={styles.checkmark} width="16" height="16" viewBox="0 0 16 16">
                    <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
