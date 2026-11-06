"use client";

import { useToast } from "@/hooks/useToast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] z-[210] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          className="pointer-events-auto flex max-w-md w-full items-center gap-3 rounded-2xl border border-glass-border bg-glass-strong/95 px-3.5 py-3 shadow-[0_12px_32px_rgba(43,52,55,0.18)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium tracking-tight text-on-surface">
              {item.title}
            </p>
            {item.description ? (
              <p className="mt-0.5 text-[11px] font-light text-on-surface-variant">
                {item.description}
              </p>
            ) : null}
          </div>
          {item.action ? (
            <button
              type="button"
              className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary transition active:scale-[0.98]"
              onClick={() => {
                item.action?.onClick();
                dismiss(item.id);
              }}
            >
              {item.action.label}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
