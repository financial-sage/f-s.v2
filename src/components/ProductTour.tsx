"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type ProductTourStep = {
  target: string;
  title: string;
  body: string;
  placement?: "top" | "bottom" | "auto";
};

type Rect = { top: number; left: number; width: number; height: number };

const TOOLTIP_ESTIMATE_H = 200;
const VIEW_PAD = 12;

function measureTarget(selector: string): Rect | null {
  if (typeof document === "undefined") return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${selector}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 && r.height < 2) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function scrollTargetIntoView(selector: string) {
  const el = document.querySelector<HTMLElement>(`[data-tour="${selector}"]`);
  if (!el) return;
  el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
}

interface ProductTourProps {
  open: boolean;
  steps: ProductTourStep[];
  onClose: (reason: "skip" | "done") => void;
}

export default function ProductTour({ open, steps, onClose }: ProductTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);
  const [vh, setVh] = useState(800);

  useEffect(() => {
    setMounted(true);
    setVh(window.innerHeight);
  }, []);

  useEffect(() => {
    if (!open) setIndex(0);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !steps[index]) {
      setRect(null);
      return;
    }

    const target = steps[index].target;
    scrollTargetIntoView(target);

    const update = () => {
      setVh(window.innerHeight);
      setRect(measureTarget(target));
    };
    // Remeasure after scroll settles
    const t0 = window.setTimeout(update, 80);
    const t1 = window.setTimeout(update, 320);
    update();
    const id = window.setInterval(update, 400);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearInterval(id);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, index, steps]);

  if (!mounted || !open || steps.length === 0) return null;

  const step = steps[index];
  const isLast = index >= steps.length - 1;
  const pad = 8;
  const maxH = Math.round(vh * 0.42);

  // Cap tall targets so the spotlight stays readable and leaves room for the tooltip
  const highlight = rect
    ? {
        top: Math.max(VIEW_PAD, rect.top - pad),
        left: Math.max(VIEW_PAD, rect.left - pad),
        width: Math.min(rect.width + pad * 2, window.innerWidth - VIEW_PAD * 2),
        height: Math.min(rect.height + pad * 2, maxH),
      }
    : null;

  const tooltipStyle = (() => {
    const width = "min(20rem, calc(100vw - 2rem))" as const;
    if (!highlight) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width,
        maxHeight: `calc(100dvh - ${VIEW_PAD * 2}px)`,
      } as const;
    }

    const spaceBelow = vh - (highlight.top + highlight.height);
    const spaceAbove = highlight.top;
    const preferBottom =
      step.placement === "bottom" ||
      (step.placement !== "top" && spaceBelow >= TOOLTIP_ESTIMATE_H + 16);
    const placeBottom =
      step.placement === "top"
        ? false
        : preferBottom || spaceAbove < TOOLTIP_ESTIMATE_H + 16;

    let top = placeBottom
      ? highlight.top + highlight.height + 12
      : highlight.top - 12;

    // Clamp so the dialog never leaves the viewport
    if (placeBottom) {
      const maxTop = vh - TOOLTIP_ESTIMATE_H - VIEW_PAD;
      if (top > maxTop) top = Math.max(VIEW_PAD, maxTop);
    } else {
      // transform -100% — keep estimated bottom edge on screen
      const minTop = TOOLTIP_ESTIMATE_H + VIEW_PAD;
      if (top < minTop) top = minTop;
    }

    return {
      top,
      left: "50%",
      transform: placeBottom ? "translateX(-50%)" : "translate(-50%, -100%)",
      width,
      maxHeight: `calc(100dvh - ${VIEW_PAD * 2}px)`,
    } as const;
  })();

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Tutorial">
      {/*
        Spotlight: transparent rounded hole + spread shadow for the dim.
        The shadow follows border-radius, so corners stay clean (no square panels).
      */}
      {highlight ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-accent/90"
          style={{
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.55)",
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-black/55" />
      )}

      <div
        className="absolute z-[81] overflow-y-auto rounded-2xl border border-glass-border bg-surface-lowest p-4 shadow-[var(--glass-shadow-lg)]"
        style={tooltipStyle}
      >
        <div className="mb-1 flex items-start justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
            {index + 1} / {steps.length}
          </p>
          <button
            type="button"
            onClick={() => onClose("skip")}
            className="rounded-full p-1 text-on-surface-variant hover:bg-surface-low"
            aria-label="Cerrar tutorial"
          >
            <X size={16} />
          </button>
        </div>
        <h3 className="text-base font-semibold tracking-tight text-on-surface">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">{step.body}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onClose("skip")}
            className="rounded-full px-3 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-low"
          >
            Saltar
          </button>
          <div className="flex gap-2">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="rounded-full border border-outline-variant/30 px-3 py-2 text-sm font-medium text-on-surface"
              >
                Atrás
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (isLast) onClose("done");
                else setIndex((i) => i + 1);
              }}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
            >
              {isLast ? "Entendido" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
