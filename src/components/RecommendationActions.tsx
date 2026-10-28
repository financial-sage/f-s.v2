"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import {
  acceptRecommendationAction,
  deferRecommendationAction,
  dismissRecommendationAction,
} from "@/app/actions/recommendations";
import { RECOMMENDATIONS_CHANGED_EVENT } from "@/components/CfoPresencePill";

type Props = {
  id: string;
  ctaHref: string | null;
  ctaLabel: string | null;
  onAfterAction?: () => void;
  /** Extra control aligned to the right of the action row (e.g. trash). */
  trailing?: ReactNode;
  className?: string;
};

function notifyRecommendationsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(RECOMMENDATIONS_CHANGED_EVENT));
}

export default function RecommendationActions({
  id,
  ctaHref,
  ctaLabel,
  onAfterAction,
  trailing,
  className = "",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "No se pudo actualizar");
        return;
      }
      notifyRecommendationsChanged();
      onAfterAction?.();
      router.refresh();
    });
  };

  return (
    <div
      className={`mt-5 border-t border-on-surface/[0.06] pt-3.5 ${className}`.trim()}
    >
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          {ctaHref && ctaLabel ? (
            <Link
              href={ctaHref}
              onClick={() => {
                void acceptRecommendationAction(id).then((result) => {
                  if (result.ok) {
                    notifyRecommendationsChanged();
                    onAfterAction?.();
                  }
                });
              }}
              className="text-[12px] font-medium tracking-tight text-accent underline-offset-4 transition-opacity hover:opacity-80 hover:underline"
            >
              {ctaLabel}
            </Link>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => acceptRecommendationAction(id))}
              className="text-[12px] font-medium tracking-tight text-accent underline-offset-4 transition-opacity hover:opacity-80 hover:underline disabled:opacity-50"
            >
              Entendido
            </button>
          )}
          <span className="text-on-surface/15" aria-hidden>
            ·
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => deferRecommendationAction(id))}
            className="text-[12px] font-light text-on-surface/55 transition-colors hover:text-on-surface disabled:opacity-50"
          >
            Más tarde
          </button>
          <span className="text-on-surface/15" aria-hidden>
            ·
          </span>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => dismissRecommendationAction(id))}
            className="text-[12px] font-light text-on-surface/45 transition-colors hover:text-on-surface/70 disabled:opacity-50"
          >
            No aplica
          </button>
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
      {error ? (
        <p className="mt-2 text-[11px] font-light text-on-surface-variant">
          {error}
        </p>
      ) : null}
    </div>
  );
}
