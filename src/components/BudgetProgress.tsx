interface BudgetProgressProps {
  spent: number;
  budget: number;
  available: number;
  dailyAverage: number;
  monthLabel: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function BudgetProgress({
  spent,
  budget,
  available,
  dailyAverage,
  monthLabel,
}: BudgetProgressProps) {
  const percent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <h3 className="font-headline text-xl font-bold">Presupuesto Grupal</h3>
        <span className="font-body text-sm font-semibold capitalize text-primary">
          {monthLabel}
        </span>
      </div>

      <div className="space-y-6 rounded-2xl bg-surface-low p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="font-headline text-3xl font-bold tracking-tighter">
              {formatCurrency(spent)}
            </span>
            <p className="font-label text-xs uppercase tracking-wider text-on-surface-variant">
              Gastados de {formatCurrency(budget)}
            </p>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary/20">
            <span className="text-sm font-bold text-primary">{percent}%</span>
          </div>
        </div>

        <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-high">
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-lowest p-4">
            <span className="mb-1 block text-[10px] font-label uppercase text-on-surface-variant">
              Disponible
            </span>
            <span className="text-lg font-bold">{formatCurrency(available)}</span>
          </div>
          <div className="rounded-2xl border border-outline-variant/10 bg-surface-lowest p-4">
            <span className="mb-1 block text-[10px] font-label uppercase text-on-surface-variant">
              Promedio Diario
            </span>
            <span className="text-lg font-bold">{formatCurrency(dailyAverage)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
