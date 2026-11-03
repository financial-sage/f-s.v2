"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import GuidanceWhyModal from "@/components/GuidanceWhyModal";
import type { GuidanceInsight } from "@/lib/decision/insights";

type Props = {
  insight: GuidanceInsight;
  className?: string;
  /** Compact edge pill next to bottom nav (left of Menú). */
  variant?: "inline" | "dock";
};

export default function GuidanceWhyTrigger({
  insight,
  className,
  variant = "inline",
}: Props) {
  const [open, setOpen] = useState(false);

  if (variant === "dock") {
    return (
      <>
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
          <div className="relative h-12 w-full">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={
                className ??
                "guidance-tag-in pointer-events-auto absolute bottom-1 left-0 z-[61] inline-flex min-h-9 max-w-[12.5rem] touch-manipulation items-center gap-1.5 rounded-r-full border border-l-0 border-outline-variant/25 bg-surface-lowest/95 py-2 pl-2.5 pr-3 text-[10px] font-light leading-none text-on-surface shadow-[0_6px_16px_rgba(43,52,55,0.12)] backdrop-blur-xl active:scale-[0.98]"
              }
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-on-surface/[0.06] text-on-surface/65">
                <Sparkles size={11} strokeWidth={1.75} aria-hidden />
              </span>
              <span className="truncate">Tu realidad hoy</span>
            </button>
          </div>
        </div>
        <GuidanceWhyModal
          open={open}
          onClose={() => setOpen(false)}
          insight={insight}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "group relative z-10 flex min-w-0 flex-1 items-center gap-2 rounded-2xl py-1 pr-2 text-left transition-opacity hover:opacity-90 active:opacity-80"
        }
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-on-surface/[0.06] text-on-surface/65">
          <Sparkles size={14} strokeWidth={1.75} aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12px] font-light leading-snug tracking-tight text-on-surface/85">
            ¿Tu realidad hoy?
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-light text-on-surface-variant/75">
            Toca para una lectura breve
          </span>
        </span>
      </button>
      <GuidanceWhyModal
        open={open}
        onClose={() => setOpen(false)}
        insight={insight}
      />
    </>
  );
}
