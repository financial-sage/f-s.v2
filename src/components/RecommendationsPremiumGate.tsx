"use client";

import { useState } from "react";
import { Crown, Lightbulb, Sparkles } from "lucide-react";
import PremiumPaywallModal from "@/components/PremiumPaywallModal";
import type { RecommendationsAccess } from "@/lib/premium";

type Props = {
  access: RecommendationsAccess;
  inviteCode?: string | null;
  isCouple: boolean;
};

export default function RecommendationsPremiumGate({
  access,
  inviteCode,
  isCouple,
}: Props) {
  const [paywallOpen, setPaywallOpen] = useState(false);

  const title =
    access === "locked"
      ? "Recomendaciones Premium"
      : "Prueba de recomendaciones";

  const body = isCouple
    ? "Durante el trial de pareja (7 días) o con Premium, recibes propuestas con IA a partir de vuestra situación. Al pausar el modo pareja, esta función se bloquea hasta activar Premium."
    : "En individual tienes 7 días de prueba gratis desde tu primer gasto o ingreso. Después, las recomendaciones con IA quedan en Premium.";

  return (
    <>
      <div className="rounded-[1.85rem] border border-glass-border bg-surface-lowest/90 px-5 py-8 text-center shadow-[0_12px_28px_rgba(43,52,55,0.06)]">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Lightbulb size={18} strokeWidth={1.75} />
        </div>
        <p className="text-[15px] font-light text-on-surface">{title}</p>
        <p className="mt-2 text-[13px] font-light leading-relaxed text-on-surface-variant">
          {body}
        </p>
        <ul className="mx-auto mt-5 max-w-sm space-y-2 text-left text-[12px] font-light text-on-surface/80">
          <li className="flex items-start gap-2 rounded-2xl border border-outline-variant/20 bg-surface-low/80 px-3 py-2.5">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-accent" />
            <span>
              Aviso suave en inicio + lista en esta página, sin chat
            </span>
          </li>
          <li className="flex items-start gap-2 rounded-2xl border border-outline-variant/20 bg-surface-low/80 px-3 py-2.5">
            <Crown size={14} className="mt-0.5 shrink-0 text-primary" />
            <span>
              {isCouple
                ? "Incluido en trial de pareja y en Premium del hogar"
                : "Prueba 7 días (individual) o Premium ilimitado"}
            </span>
          </li>
        </ul>
        <button
          type="button"
          onClick={() => setPaywallOpen(true)}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-[13px] font-medium text-on-primary shadow-sm transition-transform active:scale-[0.98]"
        >
          <Crown size={14} strokeWidth={1.75} />
          Ver Premium
        </button>
      </div>

      <PremiumPaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        inviteCode={inviteCode}
      />
    </>
  );
}
