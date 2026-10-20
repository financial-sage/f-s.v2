"use client";

import { Crown, X } from "lucide-react";
import { Portal } from "@/components/ui/Portal";

type Props = {
  open: boolean;
  onClose: () => void;
  inviteCode?: string | null;
};

const PLANS: {
  id: string;
  label: string;
  price: string;
  period: string;
  hint: string;
  featured?: boolean;
}[] = [
  {
    id: "monthly",
    label: "Mensual",
    price: "$4.99",
    period: "/ mes",
    hint: "Cancela cuando quieras",
  },
  {
    id: "yearly",
    label: "Anual",
    price: "$39.99",
    period: "/ año",
    hint: "2 meses gratis · mockup",
    featured: true,
  },
];

export default function PremiumPaywallModal({ open, onClose, inviteCode }: Props) {
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

          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm">
            <Crown size={22} />
          </div>

          <h2 className="text-xl font-light tracking-tight text-on-surface">
            SinDescuadre Premium
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            Desbloquea el modo pareja sin límites, más bolsillos, cuentas y gastos
            fijos. El pago es por código de familia: con uno basta para los dos.
          </p>

          {inviteCode ? (
            <p className="mt-3 rounded-2xl bg-surface-low px-3 py-2 text-center font-mono text-sm tracking-[0.2em] text-on-surface">
              {inviteCode}
            </p>
          ) : null}

          <div className="mt-4 space-y-2">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl border px-4 py-3 ${
                  plan.featured
                    ? "border-primary/40 bg-primary/8"
                    : "border-outline-variant/30 bg-surface-low"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-on-surface">{plan.label}</p>
                  <p className="text-sm font-medium text-on-surface">
                    {plan.price}
                    <span className="text-xs font-light text-on-surface-variant">
                      {plan.period}
                    </span>
                  </p>
                </div>
                <p className="mt-0.5 text-[11px] text-on-surface-variant">{plan.hint}</p>
              </div>
            ))}
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-on-surface-variant">
            Los precios son de ejemplo mientras definimos la pasarela de pago. Pronto
            podrás suscribirte desde aquí.
          </p>

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
