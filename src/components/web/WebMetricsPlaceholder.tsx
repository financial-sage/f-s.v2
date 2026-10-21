import { BarChart3 } from "lucide-react";
import WebChrome from "@/components/web/WebChrome";

type Props = {
  householdLabel?: string | null;
};

const PLACEHOLDER_CARDS = [
  {
    label: "Liquidez visible",
    hint: "Cuentas y efectivo del hogar",
  },
  {
    label: "Gasto del mes",
    hint: "Ritmo frente a tu media",
  },
  {
    label: "Bolsillos",
    hint: "Saldo repartido por objetivo",
  },
  {
    label: "Próximos fijos",
    hint: "Lo que viene en los próximos 14 días",
  },
] as const;

export default function WebMetricsPlaceholder({ householdLabel }: Props) {
  return (
    <>
      <WebChrome eyebrow="Métricas · Premium" subtitle={householdLabel} />

      <div className="mx-auto max-w-6xl space-y-10 px-6 py-10 lg:px-8 lg:py-14">
        <section className="flex flex-col gap-4 border-b border-outline-variant/20 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart3 size={20} />
            </div>
            <h1 className="font-headline text-3xl font-semibold tracking-tight text-on-surface lg:text-4xl">
              Panel de métricas
            </h1>
            <p className="text-base leading-relaxed text-on-surface-variant">
              Pronto verás aquí el resumen del hogar con espacio de escritorio:
              liquidez, ritmo de gastos y señales para decidir el siguiente paso.
              Mientras tanto, la app en el móvil sigue siendo tu centro de
              operaciones.
            </p>
          </div>
          <p className="shrink-0 rounded-lg border border-outline-variant/30 bg-surface-lowest px-3 py-2 text-xs font-medium text-on-surface-variant">
            Vista web · en preparación
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLACEHOLDER_CARDS.map((card) => (
            <article
              key={card.label}
              className="rounded-2xl border border-outline-variant/25 bg-surface-lowest p-5 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {card.label}
              </p>
              <div className="mt-5 h-8 w-28 rounded-md bg-surface-low" />
              <p className="mt-3 text-xs text-on-surface-variant">{card.hint}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="min-h-64 rounded-2xl border border-dashed border-outline-variant/40 bg-surface-lowest/70 p-6">
            <p className="text-sm font-medium text-on-surface">Evolución del mes</p>
            <p className="mt-1 text-xs text-on-surface-variant">
              Gráfico de ingresos y gastos — próximamente
            </p>
            <div className="mt-8 flex h-40 items-end gap-2 px-2">
              {[42, 58, 35, 70, 48, 62, 40, 55, 68, 45, 72, 50].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-primary/15"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-outline-variant/25 bg-surface-lowest p-6 shadow-sm">
            <p className="text-sm font-medium text-on-surface">Señales</p>
            <ul className="mt-4 space-y-3 text-sm text-on-surface-variant">
              <li className="rounded-xl bg-surface-low px-3 py-3">
                Resumen de desviaciones del presupuesto
              </li>
              <li className="rounded-xl bg-surface-low px-3 py-3">
                Alertas de bolsillos bajos
              </li>
              <li className="rounded-xl bg-surface-low px-3 py-3">
                Próximos movimientos fijos
              </li>
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}
