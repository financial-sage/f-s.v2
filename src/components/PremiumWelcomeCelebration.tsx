"use client";

import { useCallback, useEffect, useState } from "react";
import { Crown, Heart, Sparkles, Users, X } from "lucide-react";
import {
  dismissPremiumWelcomeAction,
  getPendingPremiumWelcomeAction,
} from "@/app/actions/premium";
import { Portal } from "@/components/ui/Portal";
import type { PremiumWelcomeCelebration } from "@/lib/premium";

export const PREMIUM_WELCOME_EVENT = "fsage:premium-welcome";

function firePremiumConfetti() {
  void (async () => {
    try {
      const confettiModule = await import("canvas-confetti");
      const confetti = confettiModule.default;
      const shared = {
        spread: 62,
        startVelocity: 22,
        ticks: 160,
        gravity: 0.95,
        scalar: 0.8,
        zIndex: 10050,
        colors: ["#1c2740", "#1e3a8a", "#c4a574", "#e8e2d6", "#60855c"],
      };
      confetti({ ...shared, particleCount: 40, origin: { x: 0.25, y: 0.35 } });
      confetti({ ...shared, particleCount: 40, origin: { x: 0.75, y: 0.35 } });
      window.setTimeout(() => {
        confetti({
          ...shared,
          particleCount: 28,
          origin: { x: 0.5, y: 0.5 },
        });
      }, 180);
    } catch {
      // ignore
    }
  })();
}

export default function PremiumWelcomeCelebration() {
  const [welcome, setWelcome] = useState<PremiumWelcomeCelebration | null>(
    null
  );
  const [open, setOpen] = useState(false);

  const tryShow = useCallback(async () => {
    try {
      const pending = await getPendingPremiumWelcomeAction();
      if (!pending) return false;
      setWelcome(pending);
      setOpen(true);
      firePremiumConfetti();
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
      if (!shown && attempts < 6) {
        window.setTimeout(() => void run(), 700);
      }
    };

    void run();

    const onCheck = () => {
      void tryShow();
    };

    window.addEventListener(PREMIUM_WELCOME_EVENT, onCheck);
    window.addEventListener("focus", onCheck);
    document.addEventListener("visibilitychange", onCheck);

    return () => {
      cancelled = true;
      window.removeEventListener(PREMIUM_WELCOME_EVENT, onCheck);
      window.removeEventListener("focus", onCheck);
      document.removeEventListener("visibilitychange", onCheck);
    };
  }, [tryShow, open]);

  async function dismiss() {
    setOpen(false);
    try {
      await dismissPremiumWelcomeAction();
    } catch {
      // ignore
    }
    setWelcome(null);
  }

  if (!open || !welcome) return null;

  const isCouple = welcome.variant === "couple";

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] overflow-hidden px-6 animate-in fade-in duration-500">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,133,92,0.22),transparent_55%),linear-gradient(to_bottom,rgba(15,23,42,0.55),rgba(15,23,42,0.72))] backdrop-blur-md" />
        <button
          type="button"
          className="absolute inset-0"
          aria-label="Cerrar"
          onClick={() => void dismiss()}
        />

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[14%] h-52 w-52 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl animate-pulse" />
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

            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-primary/15 to-accent/25 text-primary shadow-sm ring-8 ring-accent/15">
              <Crown size={26} />
            </div>

            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-on-surface-variant">
              Premium
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-on-surface">
              {isCouple ? "¡Premium para los dos!" : "¡Bienvenido a Premium!"}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
              {isCouple ? (
                <>
                  Tu hogar en pareja queda desbloqueado: bolsillos, cuentas y
                  gastos fijos sin límites free, y el modo compartido sigue
                  activo para los dos.
                </>
              ) : (
                <>
                  Tienes Premium en tu espacio: bolsillos, cuentas y gastos fijos
                  sin los límites free. Cuando invites a tu pareja, también
                  disfrutará Premium sin un segundo cobro.
                </>
              )}
            </p>

            <ul className="mt-5 space-y-2 text-left text-sm text-on-surface">
              {isCouple ? (
                <>
                  <li className="flex items-start gap-2 rounded-xl bg-surface-low px-3 py-2.5">
                    <Users size={16} className="mt-0.5 shrink-0 text-primary" />
                    Modo pareja sin pausas por límites
                  </li>
                  <li className="flex items-start gap-2 rounded-xl bg-surface-low px-3 py-2.5">
                    <Sparkles
                      size={16}
                      className="mt-0.5 shrink-0 text-accent"
                    />
                    Más bolsillos, cuentas y fijos
                  </li>
                  <li className="flex items-start gap-2 rounded-xl bg-surface-low px-3 py-2.5">
                    <Heart size={16} className="mt-0.5 shrink-0 text-primary" />
                    Un solo pago cubre a ambos
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-2 rounded-xl bg-surface-low px-3 py-2.5">
                    <Sparkles
                      size={16}
                      className="mt-0.5 shrink-0 text-accent"
                    />
                    Cupos free desbloqueados
                  </li>
                  <li className="flex items-start gap-2 rounded-xl bg-surface-low px-3 py-2.5">
                    <Users size={16} className="mt-0.5 shrink-0 text-primary" />
                    Invita a tu pareja cuando quieras
                  </li>
                  <li className="flex items-start gap-2 rounded-xl bg-surface-low px-3 py-2.5">
                    <Heart size={16} className="mt-0.5 shrink-0 text-primary" />
                    Al unirse, comparte tu Premium
                  </li>
                </>
              )}
            </ul>

            <button
              type="button"
              onClick={() => void dismiss()}
              className="mt-5 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-on-primary"
            >
              Empezar
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export function requestPremiumWelcomeCheck() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PREMIUM_WELCOME_EVENT));
}
