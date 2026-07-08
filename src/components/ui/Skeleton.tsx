"use client";

import * as React from "react";
import { cn } from "@/components/ui/cn";

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-surface-container", className)}
      {...props}
    />
  );
}
