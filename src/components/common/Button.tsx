import React from 'react';
import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'dark' | 'light'
  | 'outline-primary' | 'outline-secondary' | 'outline-success' | 'outline-danger'
  | 'outline-warning' | 'outline-info' | 'outline-dark' | 'outline-light'
  | 'ghost-primary' | 'ghost-secondary' | 'ghost-success' | 'ghost-danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  let baseClass = 'btn';

  // Manejar variantes especiales
  if (variant?.startsWith('ghost-')) {
    baseClass += ` btn-ghost btn-${variant}`;
  } else {
    baseClass += ` btn-${variant}`;
  }

  // Agregar tamaño si se especifica
  if (size) {
    baseClass += ` btn-${size}`;
  }

  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
  };

  const loadingClass = isLoading ? 'btn-loading' : '';

  return (
    <button
      className={`${baseClass} ${variant} ${sizeClasses[size]} ${loadingClass} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? 'Cargando...' : children}
    </button>
  );
};

export default Button;
