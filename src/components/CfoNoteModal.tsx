"use client";

import Link from "next/link";
import { Sparkles, Trash2, X } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import RecommendationActions from "@/components/RecommendationActions";
import { KIND_LABEL, type RecommendationKind } from "@/lib/recommendations/types";

export type CfoNotePayload = {
  id: string;
  title: string;
  body: string;
  why: string[];
  impact: string | null;
  kind: RecommendationKind;
  priority: string;
  cta_href: string | null;
  cta_label: string | null;
  status: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  note: CfoNotePayload | null;
  /** When true, hide accept/defer (archive-only read). */
  readOnly?: boolean;
  onDelete?: () => void;
};

export default function CfoNoteModal({
  open,
  onClose,
  note,
  readOnly = false,
  onDelete,
}: Props) {
  if (!open || !note) return null;

  const kindLabel = KIND_LABEL[note.kind] ?? "Nota";

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
        <button
          type="button"
          className="absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity"
          aria-label="Cerrar"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cfo-note-title"
          className="relative z-[1] w-full max-w-md overflow-hidden rounded-[1.85rem] border border-glass-border bg-surface-lowest shadow-[var(--glass-shadow-lg)] animate-in fade-in slide-in-from-bottom-4 duration-300 sm:slide-in-from-bottom-0 sm:zoom-in-95"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-36 opacity-90"
            style={{
              background:
                "radial-gradient(120% 80% at 20% 0%, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent 70%)",
            }}
            aria-hidden
          />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-full p-2 text-on-surface-variant/80 transition-colors hover:bg-on-surface/[0.05] hover:text-on-surface"
            aria-label="Cerrar"
          >
            <X size={16} strokeWidth={1.75} />
          </button>

          <div className="relative px-6 pb-6 pt-7">
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-[#3a3224] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] ring-1 ring-black/5"
                aria-hidden
              >
                <Sparkles size={18} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-light tracking-[0.14em] text-on-surface-variant/80">
                  Para ti
                </p>
                <p className="mt-1 text-[10px] font-light tracking-wide text-accent/90">
                  {kindLabel}
                </p>
              </div>
            </div>

            <h2
              id="cfo-note-title"
              className="mt-5 max-w-[22ch] text-[1.55rem] font-light leading-[1.2] tracking-tight text-on-surface-variant/85"
            >
              {note.title}
            </h2>

            <p className="mt-4 text-[15px] font-light leading-7 text-on-surface/80">
              {note.body}
            </p>

            {note.why.length > 0 ? (
              <ul className="mt-5 space-y-1.5">
                {note.why.map((line) => (
                  <li
                    key={line}
                    className="text-[12px] font-light leading-relaxed text-on-surface-variant"
                  >
                    · {line}
                  </li>
                ))}
              </ul>
            ) : null}

            {note.impact ? (
              <p className="mt-4 text-[12px] font-light leading-relaxed text-on-surface-variant/85">
                {note.impact}
              </p>
            ) : null}

            {!readOnly ? (
              <RecommendationActions
                id={note.id}
                ctaHref={note.cta_href}
                ctaLabel={note.cta_label}
                onAfterAction={onClose}
                trailing={
                  onDelete ? (
                    <button
                      type="button"
                      onClick={onDelete}
                      className="rounded-full p-2 text-on-surface-variant/50 transition-colors hover:bg-on-surface/[0.05] hover:text-on-surface"
                      aria-label="Eliminar nota"
                    >
                      <Trash2 size={15} strokeWidth={1.75} />
                    </button>
                  ) : null
                }
              />
            ) : onDelete ? (
              <div className="mt-5 flex justify-end border-t border-on-surface/[0.06] pt-3.5">
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-full p-2 text-on-surface-variant/50 transition-colors hover:bg-on-surface/[0.05] hover:text-on-surface"
                  aria-label="Eliminar nota"
                >
                  <Trash2 size={15} strokeWidth={1.75} />
                </button>
              </div>
            ) : null}

            <div className="mt-5 flex flex-col items-stretch gap-2">
              <Link
                href="/recommendations?tab=anteriores"
                onClick={onClose}
                className="pt-0.5 text-center text-[11px] font-light tracking-wide text-on-surface-variant/80 underline-offset-4 transition-colors hover:text-on-surface hover:underline"
              >
                Notas anteriores
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
