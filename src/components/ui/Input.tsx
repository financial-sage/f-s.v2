"use client";

import * as React from "react";
import { cn } from "@/components/ui/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  containerClassName?: string;
  labelClassName?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, containerClassName, labelClassName, label, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;

    return (
      <div className={cn("space-y-2", containerClassName)}>
        {label ? (
          <label
            htmlFor={inputId}
            className={cn(
              "ml-1 block text-[11px] font-light text-on-surface-variant",
              labelClassName,
            )}
          >
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-2xl border border-outline-variant/30 bg-white/55 px-5 py-3.5 text-[15px] font-medium tracking-tight text-on-surface outline-none shadow-sm backdrop-blur-sm transition-all placeholder:font-light placeholder:text-outline-variant focus:border-primary/35 focus:ring-2 focus:ring-primary/15",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

Input.displayName = "Input";
