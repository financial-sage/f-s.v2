"use client";

import { Crown, Heart, Sparkles, Users, X } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import type { HouseholdEntitlement } from "@/lib/premium";

type Props = {
  open: boolean;
  onClose: () => void;
  entitlement?: HouseholdEntitlement | null;
};

export default function PremiumBenefitsModal({
  open,
  onClose,
  entitlement,
}: Props) {
  if (!open) return null;

  const isCouple = (entitlement?.memberCount ?? 1) >= 2;

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

          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm">
            <Crown size={22} />
          </div>

          <h2 className="text-xl font-light tracking-tight text-on-surface">
            Tu Premium activo
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            {isCouple
              ? "Estas funciones están desbloqueadas para tu hogar en pareja."
              : "Estas funciones están desbloqueadas en tu espacio. Si invitas a tu pareja, las comparte sin un segundo cobro."}
          </p>

          <ul className="mt-4 space-y-2 text-sm text-on-surface">
            <li className="flex items-start gap-2 rounded-2xl border border-outline-variant/25 bg-surface-low px-3 py-3">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-accent" />
              <span>
                Recomendaciones con IA (aviso en inicio + propuestas
                accionables)
              </span>
            </li>
            <li className="flex items-start gap-2 rounded-2xl border border-outline-variant/25 bg-surface-low px-3 py-3">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-accent" />
              <span>
                Bolsillos, cuentas y gastos fijos{" "}
                <span className="font-medium">sin límites free</span>
              </span>
            </li>
            {isCouple ? (
              <li className="flex items-start gap-2 rounded-2xl border border-outline-variant/25 bg-surface-low px-3 py-3">
                <Users size={16} className="mt-0.5 shrink-0 text-primary" />
                <span>
                  Modo pareja completo: movimientos compartidos y espacio
                  conjunto sin pausa por cupos
                </span>
              </li>
            ) : (
              <li className="flex items-start gap-2 rounded-2xl border border-outline-variant/25 bg-surface-low px-3 py-3">
                <Users size={16} className="mt-0.5 shrink-0 text-primary" />
                <span>
                  Puedes invitar a tu pareja cuando quieras; al unirse, hereda
                  Premium
                </span>
              </li>
            )}
            <li className="flex items-start gap-2 rounded-2xl border border-outline-variant/25 bg-surface-low px-3 py-3">
              <Heart size={16} className="mt-0.5 shrink-0 text-primary" />
              <span>
                Un solo pago cubre el hogar: tú
                {isCouple ? " y tu pareja" : " (y tu pareja si se une)"}
              </span>
            </li>
          </ul>

          {entitlement?.premiumUntil ? (
            <p className="mt-4 text-center text-[11px] text-on-surface-variant">
              Renovación / vigencia aprox.:{" "}
              {new Date(entitlement.premiumUntil).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-on-primary"
          >
            Entendido
          </button>
        </div>
      </div>
    </Portal>
  );
}
