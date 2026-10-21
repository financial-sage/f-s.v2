import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingSavings() {
  return (
    <div className="min-h-dvh bg-page-gradient px-4 pb-28 pt-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Skeleton className="h-8 w-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-4xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
        <Skeleton className="h-16 rounded-3xl" />
        <Skeleton className="h-16 rounded-3xl" />
      </div>
    </div>
  );
}
