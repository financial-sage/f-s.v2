import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingProfile() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-page-gradient px-4 pb-28 pt-4">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="space-y-1 px-1">
          <Skeleton className="h-3 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-24 rounded-[1.85rem]" />
        <Skeleton className="h-28 rounded-[1.85rem]" />
        <Skeleton className="h-16 rounded-[1.85rem]" />
        <Skeleton className="h-56 rounded-[1.85rem]" />
      </div>
    </div>
  );
}
