"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, PartyPopper, Sparkles, X } from "lucide-react";
import {
  dismissFirstMoveCelebrationAction,
  getPendingFirstMoveCelebrationAction,
} from "@/app/actions/premium";
import { Portal } from "@/components/ui/Portal";
import type { FirstMoveCelebration } from "@/lib/premium";

const CHECK_EVENT = "fsage:first-move-celebration";

function fireSubtleConfetti() {
  void (async () => {
    try {
      const confettiModule = await import("canvas-confetti");
      const confetti = confettiModule.default;
      const shared = {
        spread: 48,
        startVelocity: 16,
        ticks: 140,
        gravity: 1,
        scalar: 0.65,
        zIndex: 10050,
        colors: ["#1c2740", "#1e3a8a", "#c4a574", "#e8e2d6"],
      };
      confetti({ ...shared, particleCount: 28, origin: { x: 0.3, y: 0.4 } });
      confetti({ ...shared, particleCount: 28, origin: { x: 0.7, y: 0.4 } });
      window.setTimeout(() => {
        confetti({
          ...shared,
          particleCount: 18,
          origin: { x: 0.5, y: 0.55 },
        });
      }, 160);
    } catch {
      // ignore
    }
  })();
}

export default function PartnerFirstMoveCelebration() {
  const [celebration, setCelebration] = useState<FirstMoveCelebration | null>(
    null
  );
  const [open, setOpen] = useState(false);

  const tryShow = useCallback(async () => {
    try {
      const pending = await getPendingFirstMoveCelebrationAction();
      if (!pending) return false;
      setCelebration(pending);
      setOpen(true);
      fireSubtleConfetti();
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const run = async () => {
      if (cancelled || open) return;
      const shown = await tryShow();
      attempts += 1;
      // Retry a few times: auth / RSC may not be ready on first paint
      if (!shown && attempts < 6) {
        window.setTimeout(() => void run(), 800);
      }
    };

    void run();

    const onCheck = () => {
      void tryShow();
    };
    const onFocus = () => {
      void tryShow();
    };

    window.addEventListener(CHECK_EVENT, onCheck);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener(CHECK_EVENT, onCheck);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [tryShow, open]);

  async function dismiss() {
    setOpen(false);
    try {
      await dismissFirstMoveCelebrationAction();
    } catch {
      // ignore
    }
    setCelebration(null);
  }

  if (!open || !celebration) return null;

  const kindLabel = celebration.kind === "income" ? "ingreso" : "gasto";
  const isActor = celebration.role === "actor";

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] overflow-hidden px-6 animate-in fade-in duration-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(28,39,64,0.28),transparent_55%),linear-gradient(to_bottom,rgba(15,23,42,0.55),rgba(15,23,42,0.72))] backdrop-blur-md" />
        <button
          type="button"
          className="absolute inset-0"
          aria-label="Cerrar"
          onClick={() => void dismiss()}
        />

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[16%] h-52 w-52 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl animate-pulse" />
          <div className="absolute right-[14%] top-[22%] h-14 w-14 rounded-full border border-accent/30 bg-accent/10 animate-pulse" />
        </div>

        <div className="relative flex h-full items-center justify-center">
          <div className="relative w-full max-w-sm rounded-4xl border border-glass-border bg-surface-lowest/92 p-6 text-center shadow-[0_20px_60px_rgba(15,23,42,0.28)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-700">
            <button
              type="button"
              onClick={() => void dismiss()}
              className="absolute right-4 top-4 rounded-full p-1.5 text-on-surface-variant hover:bg-surface-low"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-primary/15 to-accent/20 text-primary shadow-sm ring-8 ring-primary/10">
              {isActor ? <CheckCircle2 size={26} /> : <PartyPopper size={26} />}
            </div>

            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-on-surface-variant">
              Primer {kindLabel}
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-on-surface">
              {isActor ? "¡Empezó la semana de prueba!" : "¡Buenas noticias!"}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              {isActor ? (
                <>
                  Registraste el primer {kindLabel} del espacio compartido. Tienen{" "}
                  <span className="font-semibold text-on-surface">7 días</span> de
                  modo pareja para probarlo juntos.
                </>
              ) : (
                <>
                  <span className="font-semibold text-on-surface">
                    {celebration.fromName}
                  </span>{" "}
                  registró su primer {kindLabel}. Empieza su semana de prueba en
                  modo pareja.
                </>
              )}
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles size={16} />
              Modo pareja activo
            </div>

            <button
              type="button"
              onClick={() => void dismiss()}
              className="mt-5 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-on-primary"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/** Call after a successful first movement so the overlay appears without reload. */
export function requestFirstMoveCelebrationCheck() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHECK_EVENT));
}
