"use client";

import * as React from "react";
import { cn } from "@/components/ui/cn";

export type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  /** 0–100 */
  value?: number;
  indicatorClassName?: string;
};

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, indicatorClassName, ...props }, ref) => {
    const clamped = Math.min(100, Math.max(0, Number(value) || 0));

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        className={cn(
          "relative h-1.5 w-full overflow-hidden rounded-full bg-on-surface/[0.06]",
          className,
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            indicatorClassName,
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    );
  },
);

Progress.displayName = "Progress";
