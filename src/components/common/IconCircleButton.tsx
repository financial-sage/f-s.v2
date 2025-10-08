import React from 'react';

export interface IconCircleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label?: string;
  ariaLabel?: string;
}

export default function IconCircleButton({ icon, label, ariaLabel, className = '', children, ...rest }: IconCircleButtonProps) {
  return (
    <button
      {...rest}
      aria-label={ariaLabel}
      className={`flex flex-col items-center justify-center gap-2 text-center focus:outline-none ${className}`}
    >
      <span className="flex items-center justify-center bg-white/8 dark:bg-white/10 text-white w-10 h-10 rounded-full p-2" style={{ minWidth: 40, minHeight: 40 }}>
        {icon}
      </span>
      {label && <div className="text-white text-sm select-none">{label}</div>}
      {children}
    </button>
  );
}
