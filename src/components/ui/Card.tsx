"use client";

import * as React from "react";
import { cn } from "@/components/ui/cn";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("rounded-3xl bg-surface-lowest p-8 shadow-sm", className)}
      {...props}
    />
  );
});

Card.displayName = "Card";
