import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingFixedExpenses() {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-page-gradient px-4 pt-3">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-2xl" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <Skeleton className="mb-3 h-44 w-full rounded-[1.85rem]" />
      <div className="mb-2 flex justify-between px-1">
        <Skeleton className="h-4 w-16 rounded-lg" />
        <Skeleton className="h-4 w-14 rounded-lg" />
      </div>
      <div className="space-y-0 overflow-hidden rounded-[1.5rem] border border-glass-border bg-glass">
        <Skeleton className="h-10 w-full rounded-none" />
        <Skeleton className="h-10 w-full rounded-none" />
        <Skeleton className="h-10 w-full rounded-none" />
        <Skeleton className="h-10 w-full rounded-none" />
      </div>
    </div>
  );
}
