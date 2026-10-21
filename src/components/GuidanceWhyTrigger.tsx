"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import GuidanceWhyModal from "@/components/GuidanceWhyModal";
import type { GuidanceInsight } from "@/lib/decision/insights";

type Props = {
  insight: GuidanceInsight;
  className?: string;
};

export default function GuidanceWhyTrigger({ insight, className }: Props) {
  const [open, setOpen] = useState(false);

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
