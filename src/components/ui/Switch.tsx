"use client";

import { cn } from "@/components/ui/cn";

type SwitchProps = {
  checked: boolean;
  onCheckedChange?: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

/** Compact toggle — brand tokens, no third-party radix dependency. */
export function Switch({
  checked,
  onCheckedChange,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) return;
        onCheckedChange?.(!checked);
      }}
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50",
        checked
          ? "border-primary/40 bg-primary"
          : "border-outline-variant/40 bg-surface-low",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-4.5 w-4.5 h-[1.125rem] w-[1.125rem] transform rounded-full shadow-sm transition-transform",
          checked
            ? "translate-x-[1.05rem] bg-on-primary"
            : "translate-x-0 bg-on-surface/70",
        )}
      />
    </button>
  );
}
