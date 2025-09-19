import React, { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import styles from '@/scss/modules/input.module.scss';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, className = '', ...props }, ref) => {
   
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400" style={{fontWeight: "200"}}>
            {label}
          </label>
        )}
        <div className={`${styles.webflowStyleInput} ${className}`}>
          <input 
            ref={ref} 
            {...props} 
            aria-invalid={error ? 'true' : 'false'} 
            autoComplete='off'
          />
        </div>
        {error && (
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        )}
        {helpText && !error && (
          <p className="text-gray-500 dark:text-gray-400 text-sm">{helpText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;