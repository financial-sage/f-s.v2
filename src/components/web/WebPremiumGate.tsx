import { Crown } from "lucide-react";
import ActivatePremiumRow from "@/components/ActivatePremiumRow";
import SignOutButton from "@/components/SignOutButton";
import { sageGlassGradient } from "@/lib/glass";

type Props = {
  inviteCode?: string | null;
};

export default function WebPremiumGate({ inviteCode }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/v3/apple-touch-icon.png"
            alt="SinDescuadre"
            className="mb-4 h-12 w-12 rounded-[0.9rem] shadow-[0_12px_28px_rgba(43,52,55,0.18)]"
          />
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-on-surface-variant">
            Experiencia web
          </p>
          <h1 className="mt-1 text-3xl font-light tracking-tight text-on-surface">
            SinDescuadre
          </h1>
        </div>
        <SignOutButton compact />
      </header>

      <section
        className="overflow-hidden rounded-[1.85rem] border border-glass-border p-6 shadow-[0_14px_40px_rgba(43,52,55,0.12)] backdrop-blur-2xl sm:p-8"
        style={{ backgroundImage: sageGlassGradient() }}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm">
          <Crown size={22} />
        </div>
        <h2 className="text-xl font-light tracking-tight text-on-surface">
          Métricas web solo con Premium
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
          En el ordenador te mostramos el pulso de tu hogar: saldos, ritmo de
          gasto y lo que conviene mirar. Esa vista forma parte de Premium. En el
          móvil tienes la app completa; aquí, en escritorio, activamos Premium
          para desbloquear las métricas.
        </p>
      </section>

      <div className="overflow-hidden rounded-[1.5rem] border border-glass-border bg-surface-lowest/90 shadow-[0_10px_28px_rgba(43,52,55,0.08)] backdrop-blur-xl">
        <ActivatePremiumRow inviteCode={inviteCode} isPremiumHousehold={false} />
      </div>
    </div>
  );
}
