import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingCards() {
  return (
    <div className="min-h-dvh bg-surface">
      <PageHeader title="Tarjetas" subtitle="Métodos de pago" backHref="/" />
      <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 pt-8">
        <Skeleton className="mb-4 h-16 w-16 rounded-full" />
        <Skeleton className="mb-2 h-7 w-40 rounded-2xl" />
        <Skeleton className="h-4 w-56 rounded-xl" />
      </div>
    </div>
  );
}