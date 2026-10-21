import { BarChart3 } from "lucide-react";
import SignOutButton from "@/components/SignOutButton";
import { sageGlassGradient } from "@/lib/glass";

type Props = {
  householdLabel?: string | null;
};

export default function WebMetricsPlaceholder({ householdLabel }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/v3/apple-touch-icon.png"
            alt="SinDescuadre"
            className="mb-4 h-12 w-12 rounded-[0.9rem] shadow-[0_12px_28px_rgba(43,52,55,0.18)]"
          />
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-on-surface-variant">
            Métricas · Premium
          </p>
          <h1 className="mt-1 text-3xl font-light tracking-tight text-on-surface">
            SinDescuadre
          </h1>
          {householdLabel ? (
            <p className="mt-2 text-sm font-light text-on-surface-variant">
              {householdLabel}
            </p>
          ) : null}
        </div>
        <SignOutButton compact />
      </header>

      <section
        className="overflow-hidden rounded-[1.85rem] border border-glass-border p-6 shadow-[0_14px_40px_rgba(43,52,55,0.12)] backdrop-blur-2xl sm:p-8"
        style={{ backgroundImage: sageGlassGradient() }}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-on-primary shadow-sm">
          <BarChart3 size={22} />
        </div>
        <h2 className="text-xl font-light tracking-tight text-on-surface">
          Tu panel de métricas llega pronto
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-on-surface-variant">
          Aquí verás el resumen del hogar: liquidez visible, ritmo de gastos y
          señales claras para decidir el siguiente paso. Mientras tanto, la app
          en el móvil sigue siendo tu centro de operaciones.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {["Liquidez", "Gasto del mes", "Bolsillos"].map((label) => (
          <div
            key={label}
            className="rounded-[1.25rem] border border-outline-variant/25 bg-surface-lowest/80 px-4 py-5 backdrop-blur-xl"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">
              {label}
            </p>
            <p className="mt-3 h-7 w-24 animate-pulse rounded-md bg-surface-low" />
            <p className="mt-2 h-3 w-16 animate-pulse rounded bg-surface-low/80" />
          </div>
        ))}
      </div>
    </div>
  );
}
