"use client";

import { useEffect } from "react";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useExpenseStore } from "@/store/useExpenseStore";

/**
 * Invisible sync + lightweight toast when the partner mutates expenses live.
 */
export default function RealtimeSync() {
  useRealtimeSync();

  const remoteNotice = useExpenseStore((s) => s.remoteNotice);
  const clearRemoteNotice = useExpenseStore((s) => s.clearRemoteNotice);

  useEffect(() => {
    if (!remoteNotice) return;
    const id = window.setTimeout(() => clearRemoteNotice(), 3200);
    return () => window.clearTimeout(id);
  }, [remoteNotice, clearRemoteNotice]);

  if (!remoteNotice) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[200] flex justify-center px-4">
      <div className="animate-in fade-in slide-in-from-top-2 duration-200 rounded-full border border-glass-border bg-glass-strong px-3.5 py-2 text-xs font-medium text-on-surface shadow-[0_10px_28px_rgba(43,52,55,0.16)] backdrop-blur-md">
        {remoteNotice}
      </div>
    </div>
  );
}
