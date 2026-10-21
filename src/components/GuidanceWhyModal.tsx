"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import type { GuidanceInsight } from "@/lib/decision/insights";

type Props = {
  open: boolean;
  onClose: () => void;
  insight: GuidanceInsight;
};

export default function GuidanceWhyModal({ open, onClose, insight }: Props) {
  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
        <button
          type="button"
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          aria-label="Cerrar"
          onClick={onClose}
        />
        <div className="relative z-[1] w-full max-w-md overflow-hidden rounded-[1.75rem] border border-glass-border bg-surface-lowest p-5 shadow-[var(--glass-shadow-lg)] animate-in fade-in slide-in-from-bottom-4 duration-300 sm:slide-in-from-bottom-0 sm:zoom-in-95">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-1.5 text-on-surface-variant hover:bg-surface-low"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>

          <p className="text-[11px] font-light uppercase tracking-wider text-on-surface-variant">
            Orientación
          </p>
          <h2 className="mt-1 pr-8 text-xl font-light tracking-tight text-on-surface">
            {insight.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            {insight.body}
          </p>

          {insight.why.length > 0 ? (
            <div className="mt-4">
              <p className="text-[11px] font-medium text-on-surface">
                Por qué lo sabemos
              </p>
              <ul className="mt-2 space-y-2">
                {insight.why.map((line) => (
                  <li
                    key={line}
                    className="rounded-2xl border border-outline-variant/25 bg-surface-low px-3 py-2.5 text-sm text-on-surface"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-2">
            {insight.cta ? (
              <Link
                href={insight.cta.href}
                onClick={onClose}
                className="flex h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
              >
                {insight.cta.label}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 items-center justify-center rounded-2xl border border-outline-variant/30 bg-surface-low px-4 text-sm font-medium text-on-surface transition-colors hover:bg-surface"
            >
              Entendido
            </button>
            <Link
              href="/guidance"
              onClick={onClose}
              className="py-1 text-center text-[11px] font-light text-on-surface-variant underline-offset-2 hover:underline"
            >
              Ver orientación completa
            </Link>
          </div>
        </div>
      </div>
    </Portal>
  );
}
