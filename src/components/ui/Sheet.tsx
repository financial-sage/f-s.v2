"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Portal } from "@/components/ui/Portal";

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Shown under title when headerLayout is "title-row". */
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  heightClassName?: string;
  zIndexClassName?: string;
  /** If false, backdrop does not dismiss the sheet (close button only). */
  closeOnBackdrop?: boolean;
  /** When true, hide/disable the close control (e.g. while a receipt is scanning). */
  closeDisabled?: boolean;
  /**
   * close-only: X alone under the handle (default; title is aria-only).
   * title-row: title (+ subtitle) aligned with the close button.
   */
  headerLayout?: "close-only" | "title-row";
};

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  className,
  contentClassName,
  heightClassName = "h-auto max-h-[92dvh]",
  zIndexClassName = "z-[100]",
  closeOnBackdrop = false,
  closeDisabled = false,
  headerLayout = "close-only",
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
    <Portal>
      <div className={cn("fixed inset-0 flex flex-col justify-end", zIndexClassName, className)}>
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 z-0 bg-on-surface/[0.22] backdrop-blur-[10px] transition-opacity duration-500 ease-out",
            isAnimated ? "opacity-100" : "opacity-0",
            closeOnBackdrop ? "cursor-pointer" : "cursor-default",
          )}
          onClick={closeOnBackdrop ? onClose : undefined}
        />

        <div
          className={cn(
            "relative z-10 flex flex-col overflow-hidden rounded-t-[1.75rem] border border-outline-variant/20 bg-surface-lowest/98 shadow-[0_-8px_40px_rgba(28,39,64,0.08)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            heightClassName,
            isAnimated
              ? "translate-y-0 opacity-100"
              : "translate-y-[12%] opacity-0",
            contentClassName,
          )}
        >
          <div
            className={cn(
              "relative z-20 shrink-0 px-5 pt-3.5",
              headerLayout === "title-row" ? "pb-2" : "flex items-center justify-end pb-1",
            )}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-3 h-0.5 w-8 -translate-x-1/2 rounded-full bg-outline-variant/25"
            />
            {headerLayout === "title-row" ? (
              <div className="mt-2.5 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 pt-0.5">
                  {title ? (
                    <h2 className="text-base font-medium tracking-tight text-on-surface">
                      {title}
                    </h2>
                  ) : null}
                  {subtitle ? (
                    <p className="mt-0.5 text-xs text-on-surface/70">{subtitle}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  disabled={closeDisabled}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (closeDisabled) return;
                    onClose();
                  }}
                  className={cn(
                    "relative z-30 -mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant/70 transition-colors hover:bg-on-surface/[0.04] hover:text-on-surface-variant active:scale-95",
                    closeDisabled && "pointer-events-none opacity-0",
                  )}
                  aria-label={title ? `Cerrar ${title}` : "Cerrar"}
                  aria-hidden={closeDisabled}
                >
                  <X size={15} strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={closeDisabled}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (closeDisabled) return;
                  onClose();
                }}
                className={cn(
                  "relative z-30 -mr-1 flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant/70 transition-colors hover:bg-on-surface/[0.04] hover:text-on-surface-variant active:scale-95",
                  closeDisabled && "pointer-events-none opacity-0",
                )}
                aria-label={title ? `Cerrar ${title}` : "Cerrar"}
                aria-hidden={closeDisabled}
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            )}
          </div>
          <div className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-0.5">
            {children}
          </div>
        </div>
      </div>
    </Portal>
  );
}
