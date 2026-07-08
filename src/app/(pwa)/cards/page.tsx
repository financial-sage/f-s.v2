import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

export default function CardsPage() {
  return (
    <div className="min-h-dvh bg-surface">
      <PageHeader title="Tarjetas" subtitle="Métodos de pago" backHref="/" />
      <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 pt-8 text-center">
        <div className="mb-4 rounded-full bg-primary/10 p-4">
          <CreditCard className="text-primary" size={32} />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">
          Próximamente
        </h1>
        <p className="mt-2 max-w-xs text-sm text-on-surface-variant">
          Podrás vincular tus tarjetas y ver saldos en un solo lugar.
        </p>
      </div>
    </div>
  );
}
