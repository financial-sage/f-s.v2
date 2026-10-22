"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";

/**
 * Soft notice outside the dashboard scroll (ADR-0009).
 * Tag clipped to the right edge; slides in, then the bulb flashes once.
 * z-index above BottomNav so the chip stays tappable.
 */
export default function RecommendationsSoftNotice() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const [bulbLit, setBulbLit] = useState(false);
  const [enterKey, setEnterKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/recommendations/active", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number };
        const next = Math.max(0, Number(data.count) || 0);
        if (cancelled) return;
        setCount((prev) => {
          if (next > 0 && prev === 0) setEnterKey((k) => k + 1);
          return next;
        });
      } catch {
        // ignore
      }
    }

    void load();

    function onVisible() {
      if (document.visibilityState === "visible") void load();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    if (count <= 0) return;
    setBulbLit(false);
    const litOn = window.setTimeout(() => setBulbLit(true), 720);
    const litOff = window.setTimeout(() => setBulbLit(false), 1280);
    return () => {
      window.clearTimeout(litOn);
      window.clearTimeout(litOff);
    };
  }, [count, enterKey]);

  if (count <= 0) return null;
  if (pathname?.startsWith("/recommendations")) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] overflow-hidden pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      <div className="relative h-12 w-full">
        <Link
          key={enterKey}
          href="/recommendations"
          className="rec-tag-in pointer-events-auto absolute bottom-1 right-0 z-[61] inline-flex min-h-9 max-w-[12rem] touch-manipulation items-center gap-1.5 rounded-l-full border border-r-0 border-accent/30 bg-surface-lowest/95 py-2 pl-3 pr-2.5 text-[10px] font-light leading-none text-on-surface shadow-[0_6px_16px_rgba(43,52,55,0.12)] backdrop-blur-xl active:scale-[0.98]"
        >
          <span
            className={`rec-bulb-glow flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-accent ${
              bulbLit ? "is-lit" : ""
            }`}
          >
            <Lightbulb
              size={11}
              strokeWidth={1.75}
              fill={bulbLit ? "currentColor" : "none"}
              aria-hidden
            />
          </span>
          <span className="truncate">
            {count === 1
              ? "1 recomendación"
              : `${count} recomendaciones`}
          </span>
        </Link>
      </div>
    </div>
  );
}
