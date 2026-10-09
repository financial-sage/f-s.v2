"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/components/ui/cn";

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  heightClassName?: string;
  zIndexClassName?: string;
  /** If false, backdrop does not dismiss the sheet (close button only). */
  closeOnBackdrop?: boolean;
};

export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
  contentClassName,
  heightClassName = "h-auto max-h-[92dvh]",
  zIndexClassName = "z-[100]",
  closeOnBackdrop = false,
}: SheetProps) {
  const [isAnimated, setIsAnimated] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      requestAnimationFrame(() => requestAnimationFrame(() => setIsAnimated(true)));
      return;
    }
    setIsAnimated(false);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className={cn("fixed inset-0 flex flex-col justify-end", zIndexClassName, className)}>
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-on-surface/50 backdrop-blur-sm transition-opacity duration-300",
          isAnimated ? "opacity-100" : "opacity-0",
          closeOnBackdrop ? "cursor-pointer" : "cursor-default",
        )}
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      <div
        className={cn(
          "relative flex flex-col overflow-hidden rounded-t-[2rem] bg-linear-to-b from-[#f7f8f5] to-[#eef1eb] shadow-[0_-16px_48px_rgba(43,52,55,0.18)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          heightClassName,
          isAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
          contentClassName,
        )}
      >
        <div className="relative flex shrink-0 items-center justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-outline-variant/40" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/25 bg-white/70 text-on-surface-variant shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
            aria-label={title ? `Cerrar ${title}` : "Cerrar"}
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-4 pb-5 pt-1">{children}</div>
      </div>
    </div>
  );
}
