"use client";

import { useEffect, useState } from "react";
import { Lightbulb, PencilLine, X } from "lucide-react";
import { Portal } from "@/components/ui/Portal";

type Props = {
  open: boolean;
  fundLabel: string | null;
  suggestions: string[];
  onClose: () => void;
  onPick: (concept: string) => void;
};

export default function ConceptSuggestModal({
  open,
  fundLabel,
  suggestions,
  onClose,
  onPick,
}: Props) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (open) setDraft("");
  }, [open]);

  if (!open) return null;

  const hasSuggestions = suggestions.length > 0;
  const trimmed = draft.trim();

  return (
    <Portal>
      <div className="fixed inset-0 z-[230] flex items-end justify-center p-3 sm:items-center sm:p-4">
        <button
          type="button"
          className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          aria-label="Cerrar"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="concept-suggest-title"
          className="relative z-[1] w-full max-w-md overflow-hidden rounded-[1.85rem] border border-glass-border bg-surface-lowest shadow-[var(--glass-shadow-lg)] animate-in fade-in slide-in-from-bottom-4 duration-300 sm:slide-in-from-bottom-0 sm:zoom-in-95"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-full p-2 text-on-surface-variant/80 transition-colors hover:bg-on-surface/[0.05] hover:text-on-surface"
            aria-label="Cerrar"
          >
            <X size={16} strokeWidth={1.75} />
          </button>

          <div className="relative px-5 pb-5 pt-7">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Lightbulb size={18} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-light tracking-[0.14em] text-on-surface-variant/80">
                  Concepto
                </p>
                <h2
                  id="concept-suggest-title"
                  className="mt-1 text-[1.2rem] font-light tracking-tight text-on-surface"
                >
                  ¿En qué gastaste?
                </h2>
              </div>
            </div>

            {hasSuggestions ? (
              <>
                <p className="mt-3 text-[13px] font-light leading-relaxed text-on-surface-variant">
                  {fundLabel
                    ? `En ${fundLabel} sueles registrar cosas como estas:`
                    : "Sueles registrar cosas como estas:"}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {suggestions.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => onPick(item)}
                      className="max-w-full truncate rounded-full border border-outline-variant/30 bg-surface-low px-3 py-1.5 text-[12px] font-medium text-on-surface transition-colors hover:border-accent/40 hover:bg-accent/10"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-3 text-[13px] font-light leading-relaxed text-on-surface-variant">
                No olvides registrar en qué se gastó el dinero
                {fundLabel ? ` de ${fundLabel}` : ""}. Así el historial y las
                recomendaciones tienen más sentido.
              </p>
            )}

            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-outline-variant/25 bg-surface-low/80 px-3 py-2.5">
              <PencilLine size={15} className="shrink-0 text-on-surface/55" />
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && trimmed) {
                    e.preventDefault();
                    onPick(trimmed);
                  }
                }}
                placeholder="Escríbelo aquí…"
                className="w-full border-none bg-transparent text-[14px] font-medium text-on-surface outline-none placeholder:font-light placeholder:text-on-surface/40"
                autoFocus
              />
            </div>

            <button
              type="button"
              disabled={!trimmed}
              onClick={() => onPick(trimmed)}
              className="mt-4 flex w-full items-center justify-center rounded-2xl bg-primary py-2.5 text-[13px] font-semibold text-on-primary transition-transform active:scale-[0.98] disabled:opacity-45"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
