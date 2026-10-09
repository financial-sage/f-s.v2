import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingHome() {
  return (
    <div className="min-h-dvh bg-surface px-4 pb-28 pt-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Skeleton className="h-8 w-40 rounded-2xl" />
        <Skeleton className="h-28 rounded-4xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
        <Skeleton className="h-36 rounded-4xl" />
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-3xl" />
          <Skeleton className="h-16 rounded-3xl" />
          <Skeleton className="h-16 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
