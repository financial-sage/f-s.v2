import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingProfile() {
  return (
    <div className="min-h-dvh bg-surface px-4 pb-28 pt-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-36 rounded-xl" />
            <Skeleton className="h-4 w-24 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-28 rounded-4xl" />
        <div className="space-y-3">
          <Skeleton className="h-14 rounded-3xl" />
          <Skeleton className="h-14 rounded-3xl" />
          <Skeleton className="h-14 rounded-3xl" />
          <Skeleton className="h-14 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
