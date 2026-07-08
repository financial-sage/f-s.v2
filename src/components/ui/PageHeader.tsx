"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/components/ui/cn";

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  right?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, backHref, right, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 border-b border-outline-variant/30 bg-surface/80 px-4 backdrop-blur-md",
        className,
      )}
    >
      <div className="grid h-14 grid-cols-[36px_1fr_36px] items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="Volver"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-lowest text-on-surface-variant shadow-sm transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <ArrowLeft size={18} />
            </Link>
          ) : null}
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-base font-bold leading-tight tracking-tight text-on-surface">
            {title}
          </h1>
          <p className="truncate text-[11px] font-medium leading-tight text-on-surface-variant">
            {subtitle ?? ""}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center justify-self-end">
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </div>
    </header>
  );
}
