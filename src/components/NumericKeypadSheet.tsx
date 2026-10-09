"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import CustomNumpad from "@/components/CustomNumpad";

interface NumericKeypadSheetProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  accentColor?: string;
  initialValue?: string;
  showDisplay?: boolean;
  errorMessage?: string;
  onClose: () => void;
  onValueChange: (value: string) => void;
  onConfirm: (value?: string) => void;
}

export function NumericKeypadSheet({
  isOpen,
  title,
  subtitle,
  accentColor = "#4A6549",
  initialValue,
  showDisplay = true,
  errorMessage,
  onClose,
  onValueChange,
  onConfirm,
}: NumericKeypadSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-on-surface/45 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[201] overflow-hidden rounded-t-[2rem] border border-white/55 bg-white/55 shadow-[0_-16px_48px_rgba(43,52,55,0.16)] backdrop-blur-2xl animate-in slide-in-from-bottom-full duration-300">
        <div className="mx-auto flex w-full max-w-md flex-col">
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-outline-variant/35" />
          </div>

          <div className="relative flex items-start justify-between gap-3 px-5 pb-2 pt-1">
            <div className="min-w-0 flex-1 pr-8">
              {title ? (
                <h4 className="text-base font-medium tracking-tight text-on-surface">{title}</h4>
              ) : null}
              {subtitle ? (
                <div className="mt-1.5 inline-flex max-w-full items-center gap-2 rounded-full border border-white/60 bg-white/45 px-2.5 py-1 shadow-sm backdrop-blur-md">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: accentColor }}
                    aria-hidden
                  />
                  <span
                    className="truncate text-sm font-semibold"
                    style={{ color: accentColor }}
                  >
                    {subtitle}
                  </span>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-1 flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-white/60 text-on-surface-variant shadow-sm backdrop-blur-md transition-colors hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>

          {errorMessage ? (
            <div className="px-5 pb-2">
              <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-sm font-medium text-rose-700 shadow-sm">
                {errorMessage}
              </p>
            </div>
          ) : null}

          <CustomNumpad
            isOpen={isOpen}
            embedded
            embeddedStyle="flat"
            showDisplay={showDisplay}
            accentColor={accentColor}
            initialValue={initialValue || "0"}
            onClose={onClose}
            onValueChange={onValueChange}
            onConfirm={onConfirm}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
