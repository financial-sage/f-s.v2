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
      <div className={styles.webflowStyleInput}>
        <input ref={ref} {...props} aria-invalid={error ? 'true' : 'false'} autoComplete='off'/>
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
