"use client";

import * as React from "react";
import { cn } from "@/components/ui/cn";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, right, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 border-b border-outline-variant/30 bg-surface/80 px-4 backdrop-blur-md",
        className,
      )}
    >
      <div className="flex h-14 items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-medium leading-tight tracking-tight text-on-surface">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-[11px] font-light leading-tight text-on-surface-variant">
              {subtitle}
            </p>
          ) : null}
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </header>
  );
}
