"use client";

import * as React from "react";
import { cn } from "@/components/ui/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

const variants: Record<ButtonVariant, string> = {
  primary:
    "rounded-full bg-primary px-4 text-on-primary shadow-lg shadow-primary/10 hover:brightness-[1.02]",
  secondary:
    "rounded-full bg-surface-low px-4 text-on-surface shadow-sm hover:bg-surface-container",
  outline:
    "rounded-full border border-outline-variant/40 bg-surface-lowest px-4 text-on-surface hover:bg-surface-low",
  ghost: "rounded-full px-4 text-on-surface-variant hover:bg-surface-low hover:text-on-surface",
  destructive: "rounded-full bg-error px-4 text-white shadow-sm hover:brightness-105",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 text-sm",
  md: "h-12 text-base",
  lg: "h-14 text-lg",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
