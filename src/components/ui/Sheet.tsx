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
};

export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
  contentClassName,
  heightClassName = "h-[80vh]",
  zIndexClassName = "z-80",
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
      <button
        type="button"
        aria-label="Cerrar"
        className={cn(
          "absolute inset-0 bg-on-surface/50 backdrop-blur-sm transition-opacity duration-300",
          isAnimated ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "relative flex flex-col rounded-t-[2.5rem] bg-surface shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          heightClassName,
          isAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
          contentClassName,
        )}
      >
        <div className="relative flex items-center justify-center pt-4 pb-2">
          <div className="h-1.5 w-12 rounded-full bg-surface-container" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-6 rounded-full bg-surface-low p-1.5 text-outline-variant transition-colors hover:text-on-surface"
            aria-label={title ? `Cerrar ${title}` : "Cerrar"}
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-8">{children}</div>
      </div>
    </div>
  );
}
