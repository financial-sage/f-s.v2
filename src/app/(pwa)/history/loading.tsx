import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingHistory() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface">
      <PageHeader title="Historial de Movimientos" backHref="/" />
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
        <div className="mx-auto w-full max-w-md space-y-4">
          <Skeleton className="h-20 rounded-4xl" />
          <Skeleton className="h-12 rounded-4xl" />
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-3xl" />
            <Skeleton className="h-16 rounded-3xl" />
            <Skeleton className="h-16 rounded-3xl" />
            <Skeleton className="h-16 rounded-3xl" />
            <Skeleton className="h-16 rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

