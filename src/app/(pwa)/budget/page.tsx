import Link from "next/link";
import { PiggyBank } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

export default function BudgetPage() {
  return (
    <div className="min-h-dvh bg-surface">
      <PageHeader title="Presupuesto" subtitle="Control mensual" backHref="/" />
      <div className="mx-auto w-full max-w-md px-4 pt-6 pb-28">
        <div className="px-2 text-center">
          <p className="text-sm text-on-surface-variant">
            Próximamente podrás definir metas y límites por bolsillo y fondo común.
          </p>
        </div>

        <div className="mt-8 rounded-4xl bg-surface-lowest p-6 shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PiggyBank size={28} />
          </div>

          <h2 className="text-center text-lg font-bold text-on-surface">
            En construcción
          </h2>
          <p className="mt-2 text-center text-sm text-on-surface-variant">
            Mientras tanto, puedes revisar tu actividad y saldos desde el dashboard.
          </p>

          <div className="mt-6 space-y-3">
            <Link
              href="/"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-base font-semibold text-on-primary shadow-lg shadow-primary/10 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              Volver al Dashboard
            </Link>
            <Link
              href="/history"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-outline-variant/40 bg-surface-lowest px-4 text-base font-semibold text-on-surface transition-all active:scale-[0.98] hover:bg-surface-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              Ver historial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
