"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useCurrency, CURRENCIES, Currency } from '@/src/contexts/CurrencyContext';
import { ChevronDown, Check } from 'lucide-react';

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
    <div className="relative inline-block" ref={dropdownRef}>
      <button 
        className="flex items-center gap-1 px-3 py-2 bg-transparent border-0 rounded text-zinc-300 text-sm font-medium cursor-pointer transition-all duration-200 hover:bg-transparent focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        title="Cambiar moneda"
      >
        <span className="font-light text-base">{currency.symbol}</span>
        <span className="text-xs opacity-90">{currency.code}</span>
        <ChevronDown 
          size={12}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+0.5rem)] right-0 min-w-[280px] bg-zinc-900/95 border border-zinc-700/50 rounded-xl shadow-xl z-[1000] overflow-hidden backdrop-blur-md">
          <div className="px-4 py-2 font-light text-base text-zinc-100 border-b border-zinc-700/50">
            Seleccionar Moneda
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {CURRENCIES.map((curr) => (
              <button
                key={curr.code}
                className={`w-full flex items-center gap-3 px-4 py-2 bg-transparent border-none cursor-pointer transition-colors duration-150 text-left ${
                  curr.code === currency.code 
                    ? 'bg-zinc-800/50 text-zinc-50' 
                    : 'text-zinc-300 hover:bg-zinc-800/30'
                }`}
                onClick={() => handleCurrencySelect(curr)}
              >
                <span className="text-xl font-light min-w-[2rem] text-center">{curr.symbol}</span>
                <div className="flex-1 flex flex-col gap-0.5">
                  <span className="font-light text-xs text-zinc-100">{curr.code}</span>
                  <span className="text-xs text-zinc-500">{curr.name}</span>
                </div>
                {curr.code === currency.code && (
                  <Check size={16} className="text-emerald-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
