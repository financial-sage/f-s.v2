"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, WandSparkles, X } from "lucide-react";
import { forceGeminiRecommendationsAction } from "@/app/actions/recommendations";
import { Portal } from "@/components/ui/Portal";
import type { ForceGeminiDraftResult } from "@/lib/recommendations/types";

type Props = {
  isSuperAdmin: boolean;
};

export default function RecommendationsAdminTools({ isSuperAdmin }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [result, setResult] = useState<ForceGeminiDraftResult | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);

  if (!isSuperAdmin) return null;

  const runForce = () => {
    setGateError(null);
    startTransition(async () => {
      const res = await forceGeminiRecommendationsAction();
      if (res.ok) {
        setResult(res.result);
        setGateError(null);
        setModalOpen(true);
      } else {
        setGateError(res.error);
        setResult(res.result ?? null);
        setModalOpen(true);
      }
      router.refresh();
    });
  };

  const failures = result?.items.filter((i) => !i.ok) ?? [];
  const hasFailure =
    Boolean(gateError) ||
    Boolean(result && (!result.ok || result.failed > 0));

  return (
    <>
      <div className="rounded-2xl border border-dashed border-accent/35 bg-accent/5 px-4 py-3">
        <p className="text-[10px] font-light uppercase tracking-[0.12em] text-on-surface-variant/70">
          Superadmin
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={runForce}
          className="mt-2 inline-flex items-center gap-2 rounded-full border border-accent/40 bg-surface-lowest px-3.5 py-2 text-[12px] font-medium text-accent transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" strokeWidth={1.75} />
          ) : (
            <WandSparkles size={14} strokeWidth={1.75} />
          )}
          Forzar recomendaciones IA
        </button>
      </div>

      {modalOpen ? (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
              aria-label="Cerrar"
              onClick={() => setModalOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="rec-admin-debug-title"
              className="relative z-[1] w-full max-w-md overflow-hidden rounded-[1.85rem] border border-glass-border bg-surface-lowest shadow-[var(--glass-shadow-lg)] animate-in fade-in slide-in-from-bottom-4 duration-300 sm:slide-in-from-bottom-0 sm:zoom-in-95"
            >
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="absolute right-3 top-3 z-10 rounded-full p-2 text-on-surface-variant/80 transition-colors hover:bg-on-surface/[0.05] hover:text-on-surface"
                aria-label="Cerrar"
              >
                <X size={16} strokeWidth={1.75} />
              </button>

              <div className="relative px-6 pb-6 pt-7">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-black/5 ${
                      hasFailure
                        ? "bg-orange-500/15 text-orange-600"
                        : "bg-accent text-[#3a3224]"
                    }`}
                    aria-hidden
                  >
                    {hasFailure ? (
                      <AlertTriangle size={18} strokeWidth={1.9} />
                    ) : (
                      <WandSparkles size={18} strokeWidth={1.9} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-light tracking-[0.14em] text-on-surface-variant/80">
                      Debug IA
                    </p>
                    <h2
                      id="rec-admin-debug-title"
                      className="mt-1 text-[1.15rem] font-light tracking-tight text-on-surface"
                    >
                      {hasFailure
                        ? "Falló la regeneración"
                        : "Regeneración OK"}
                    </h2>
                  </div>
                </div>

                {gateError && !result ? (
                  <p className="mt-4 text-[13px] font-light leading-relaxed text-on-surface/80">
                    {gateError}
                  </p>
                ) : null}

                {result ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-[13px] font-light leading-relaxed text-on-surface/80">
                      {result.message}
                    </p>
                    <dl className="grid grid-cols-2 gap-2 text-[11px] font-light text-on-surface-variant">
                      <div className="rounded-xl bg-on-surface/[0.04] px-3 py-2">
                        <dt>Modelo</dt>
                        <dd className="mt-0.5 font-medium text-on-surface">
                          {result.model}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-on-surface/[0.04] px-3 py-2">
                        <dt>OpenAI</dt>
                        <dd className="mt-0.5 font-medium text-on-surface">
                          {result.geminiConfigured ? "Presente" : "Ausente"}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-on-surface/[0.04] px-3 py-2">
                        <dt>OK</dt>
                        <dd className="mt-0.5 font-medium text-on-surface">
                          {result.upgraded}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-on-surface/[0.04] px-3 py-2">
                        <dt>Fallos</dt>
                        <dd className="mt-0.5 font-medium text-on-surface">
                          {result.failed}
                        </dd>
                      </div>
                    </dl>

                    {failures.length > 0 ? (
                      <ul className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
                        {failures.map((item) => (
                          <li
                            key={item.ruleId}
                            className="text-[12px] font-light leading-snug text-on-surface/85"
                          >
                            <span className="font-medium text-orange-700">
                              {item.ruleId}
                            </span>
                            <span className="mt-0.5 block break-words text-on-surface-variant">
                              {item.error ?? "Error desconocido"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="mt-5 w-full rounded-2xl border border-outline-variant/30 bg-surface py-2.5 text-[13px] font-medium text-on-surface transition-colors hover:bg-on-surface/[0.03]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </Portal>
      ) : null}
    </>
  );
}
