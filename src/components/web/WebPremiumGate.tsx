import { Crown, Smartphone } from "lucide-react";
import ActivatePremiumRow from "@/components/ActivatePremiumRow";
import WebChrome from "@/components/web/WebChrome";

type Props = {
  inviteCode?: string | null;
};

export default function WebPremiumGate({ inviteCode }: Props) {
  return (
    <>
      <WebChrome eyebrow="Métricas web" subtitle="Disponible con Premium" />

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-14">
        <section className="space-y-6">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-on-primary">
            <Crown size={20} />
          </div>
          <div className="max-w-xl space-y-3">
            <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface lg:text-4xl">
              Las métricas del hogar viven aquí
            </h1>
            <p className="text-base leading-relaxed text-on-surface-variant">
              En el ordenador verás el pulso de tu hogar con más espacio: saldos,
              ritmo de gasto y señales claras. Esa vista forma parte de Premium.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-outline-variant/30 bg-surface-lowest px-4 py-3 text-sm text-on-surface-variant">
            <Smartphone size={18} className="mt-0.5 shrink-0 text-primary" />
            <p>
              En el móvil sigue disponible la app completa. Aquí, en escritorio,
              activamos Premium para desbloquear las métricas.
            </p>
          </div>
        </section>

        <aside className="self-start rounded-2xl border border-outline-variant/30 bg-surface-lowest p-2 shadow-sm">
          <div className="border-b border-outline-variant/20 px-4 pb-3 pt-4">
            <p className="text-sm font-semibold text-on-surface">Activar Premium</p>
            <p className="mt-1 text-xs leading-relaxed text-on-surface-variant">
              Usa el código de familia. Con uno basta para todo el hogar.
            </p>
          </div>
          <ActivatePremiumRow inviteCode={inviteCode} isPremiumHousehold={false} />
        </aside>
      </div>
    </>
  );
}
