"use client";

import { useState, useTransition } from "react";
import { Crown } from "lucide-react";
import { activatePremiumByInviteCodeAction } from "@/app/actions/premium";
import type { HouseholdEntitlement } from "@/lib/premium";

type Props = {
  entitlement: HouseholdEntitlement | null | undefined;
};

export default function HouseholdStatusBanner({ entitlement }: Props) {
  const [code, setCode] = useState(entitlement?.inviteCode ?? "");
  const [error, setError] = useState("");
  const [showActivate, setShowActivate] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!entitlement) return null;
  if (entitlement.coupleMode !== "couple_paused") return null;

  return (
    <div className="shrink-0 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3">
      <div className="flex items-start gap-2">
        <Crown size={15} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-200" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-on-surface">
            Modo pareja en pausa
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
            Tus datos compartidos se conservan. Activa Premium con el código de
            familia para volver a ver el dashboard en pareja.
          </p>
          {!showActivate ? (
            <button
              type="button"
              onClick={() => setShowActivate(true)}
              className="mt-2 text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
            >
              Activar Premium
            </button>
          ) : (
            <div className="mt-2 space-y-2">
              <input
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
                  )
                }
                maxLength={6}
                placeholder="Código familia"
                className="w-full rounded-xl border border-outline-variant/40 bg-surface-lowest px-3 py-2 text-center font-mono text-sm tracking-widest text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
              />
              {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
              <button
                type="button"
                disabled={isPending || code.length !== 6}
                onClick={() => {
                  setError("");
                  startTransition(async () => {
                    try {
                      await activatePremiumByInviteCodeAction(code);
                      window.location.reload();
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "No se pudo activar."
                      );
                    }
                  });
                }}
                className="w-full rounded-full bg-primary px-3 py-2 text-[11px] font-semibold text-on-primary disabled:opacity-50"
              >
                {isPending ? "Activando…" : "Confirmar código"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
