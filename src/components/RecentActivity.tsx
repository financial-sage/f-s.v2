import Link from "next/link";
import {
  Car,
  Coffee,
  ReceiptText,
  ShoppingCart,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { DashboardTransaction } from "@/lib/dashboard";

interface RecentActivityProps {
  transactions: DashboardTransaction[];
}

const iconMap: Record<DashboardTransaction["iconKey"], LucideIcon> = {
  "shopping-cart": ShoppingCart,
  coffee: Coffee,
  car: Car,
  utensils: UtensilsCrossed,
  receipt: ReceiptText,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function RecentActivity({ transactions }: RecentActivityProps) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-headline text-xl font-bold">Actividad Reciente</h3>
        <Link href="/history" className="text-sm font-semibold text-primary hover:underline">
          Ver Todo
        </Link>
      </div>

      <div className="space-y-3">
        {transactions.length === 0 ? (
          <div className="rounded-2xl bg-surface-low p-5 text-sm text-on-surface-variant">
            Aún no hay gastos registrados. Añade el primero para ver actividad aquí.
          </div>
        ) : (
          transactions.map((tx) => {
            const Icon = iconMap[tx.iconKey];
            return (
              <div
                key={tx.id}
                className={`group flex items-center justify-between rounded-2xl p-4 transition-colors ${
                  tx.isShared
                    ? "bg-surface-low hover:bg-surface-container"
                    : "border border-outline-variant/10 bg-surface-lowest hover:bg-surface-low"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
                      tx.isShared
                        ? "bg-surface-lowest text-primary"
                        : "bg-surface-low text-on-surface-variant"
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.6} />
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">{tx.concept}</p>
                    <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant">
                      {tx.dateLabel}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-on-surface">-{formatCurrency(tx.amount)}</p>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${
                      tx.isShared
                        ? "bg-purple-100 text-purple-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {tx.isShared ? "Compartido" : "Personal"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
