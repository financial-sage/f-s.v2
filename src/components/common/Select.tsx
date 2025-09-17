import React from 'react';
import type { SelectHTMLAttributes } from 'react';
import style from '@/scss/modules/input.module.scss';

interface Option {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  error?: string;
  helpText?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  helpText,
  className = '',
  ...props
}) => {
  return (
    <div className={style.webflowStyleInput}>
      <select {...props} aria-invalid={error ? 'true' : 'false'} aria-describedby={error ? 'error-message' : helpText ? 'help-text' : undefined}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>

  );
};

export default Select;
