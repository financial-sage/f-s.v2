import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingAccounts() {
  return (
    <div className="min-h-dvh bg-page-gradient px-4 pb-28 pt-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <Skeleton className="h-8 w-36 rounded-2xl" />
        <Skeleton className="h-28 rounded-4xl" />
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-3xl" />
          <Skeleton className="h-20 rounded-3xl" />
          <Skeleton className="h-20 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
