"use client";

import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { SoftDecimals } from "@/components/FormattedCurrency";
import { Portal } from "@/components/ui/Portal";
import type { GuidanceInsight } from "@/lib/decision/insights";

type Props = {
  open: boolean;
  onClose: () => void;
  insight: GuidanceInsight;
};

export default function GuidanceWhyModal({ open, onClose, insight }: Props) {
  if (!open) return null;

  const ctaGoesToGuidance = insight.cta?.href === "/guidance";

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
          aria-labelledby="guidance-why-title"
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
                  Orientación
                </p>
                <span
                  className="mt-1.5 block h-px w-8 bg-accent/70"
                  aria-hidden
                />
              </div>
            </div>

            <h2
              id="guidance-why-title"
              className="mt-5 max-w-[20ch] text-[1.65rem] font-light leading-[1.2] tracking-tight text-on-surface-variant/80"
            >
              {insight.title}
            </h2>

            <p className="mt-4 text-[15px] font-light leading-7 text-on-surface/80">
              {insight.summary}
            </p>

            {insight.highlights.length > 0 ? (
              <dl className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {insight.highlights.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="rounded-2xl bg-on-surface/[0.035] px-3.5 py-3 ring-1 ring-on-surface/[0.05]"
                  >
                    <dt className="truncate text-[10px] font-light tracking-wide text-on-surface-variant/75">
                      {item.label}
                    </dt>
                    <dd className="mt-1 text-[15px] font-light tabular-nums tracking-tight text-on-surface">
                      <SoftDecimals>{item.value}</SoftDecimals>
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div className="mt-7 flex flex-col items-stretch gap-2.5">
              {insight.cta ? (
                <Link
                  href={insight.cta.href}
                  onClick={onClose}
                  className={
                    ctaGoesToGuidance
                      ? "flex min-h-11 items-center justify-center rounded-full border border-on-surface/10 bg-on-surface/[0.03] px-5 py-2.5 text-center text-[13px] font-light leading-snug tracking-tight text-on-surface/85 transition-[background,border-color] hover:border-on-surface/20 hover:bg-on-surface/[0.06]"
                      : "flex h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
                  }
                >
                  {insight.cta.label}
                </Link>
              ) : null}
              {!ctaGoesToGuidance ? (
                <Link
                  href="/guidance"
                  onClick={onClose}
                  className="pt-0.5 text-center text-[11px] font-light tracking-wide text-on-surface-variant/80 underline-offset-4 transition-colors hover:text-on-surface hover:underline"
                >
                  Ver orientación completa
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
