import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingCategories() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface">
      <PageHeader title="Categorías" backHref="/" />
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
        <div className="mx-auto w-full max-w-md space-y-3">
          <Skeleton className="h-12 rounded-4xl" />
          <Skeleton className="h-14 rounded-3xl" />
          <Skeleton className="h-14 rounded-3xl" />
          <Skeleton className="h-14 rounded-3xl" />
          <Skeleton className="h-14 rounded-3xl" />
          <Skeleton className="h-14 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
