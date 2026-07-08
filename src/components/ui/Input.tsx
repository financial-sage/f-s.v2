"use client";

import * as React from "react";
import { cn } from "@/components/ui/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  containerClassName?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, containerClassName, label, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;

    return (
      <div className={cn("space-y-2", containerClassName)}>
        {label ? (
          <label
            htmlFor={inputId}
            className="ml-4 block font-label text-xs font-semibold uppercase tracking-widest text-on-surface-variant"
          >
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-2xl border-none bg-surface-low px-6 py-4 text-on-surface outline-none transition-all placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

Input.displayName = "Input";
