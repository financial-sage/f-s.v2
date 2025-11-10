import React from 'react';
import { useCurrency } from '@/src/contexts/CurrencyContext';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function CurrencyInput({ value, onChange, className = '', ...props }: CurrencyInputProps) {
  const { currency } = useCurrency();
  
  // Determinar si el símbolo va al inicio o al final
  const symbolAtEnd = currency.code === 'EUR';
  
  if (symbolAtEnd) {
    // Para EUR, mostrar el símbolo fuera del input, a la derecha
    return (
      <div className="relative w-full flex items-center gap-1.5">
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={onChange}
          className={`flex-1 min-w-0 px-3 py-3 sm:py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-base sm:text-sm text-right ${className}`}
          {...props}
        />
        <span className="text-zinc-400 text-sm sm:text-xs font-medium flex-shrink-0">
          {currency.symbol}
        </span>
      </div>
    );
  }
  
  // Para otras monedas, mostrar el símbolo dentro del input a la izquierda
  return (
    <div className="relative w-full">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none text-base sm:text-sm font-medium">
        {currency.symbol}
      </div>
      <input
        type="number"
        step="0.01"
        value={value}
        onChange={onChange}
        className={`w-full pl-8 sm:pl-7 pr-3 py-3 sm:py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all text-base sm:text-sm text-right ${className}`}
        {...props}
      />
    </div>
  );
}
