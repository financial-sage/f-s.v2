"use client";

import { useState, useTransition } from "react";
import { Crown } from "lucide-react";
import { activatePremiumByInviteCodeAction } from "@/app/actions/premium";

type Props = {
  inviteCode?: string | null;
  isPremiumHousehold?: boolean;
};

export default function ActivatePremiumRow({
  inviteCode,
  isPremiumHousehold = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(inviteCode ?? "");
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm">
            <Crown size={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-on-surface">Premium</p>
            <p className="text-[11px] font-light text-on-surface-variant">
              {isPremiumHousehold
                ? "Hogar desbloqueado"
                : "Activa con el código de familia"}
            </p>
          </div>
        </div>
        {!isPremiumHousehold ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs font-semibold text-primary"
          >
            {open ? "Cerrar" : "Activar"}
          </button>
        ) : null}
      </div>

      {open && !isPremiumHousehold ? (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] leading-relaxed text-on-surface-variant">
            Cualquier miembro puede activar Premium introduciendo el código de
            su familia (stub hasta el pago real).
          </p>
          <input
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
              )
            }
            maxLength={6}
            placeholder="ABC123"
            className="w-full rounded-xl border border-outline-variant/40 bg-surface-low px-3 py-2.5 text-center font-mono text-base tracking-[0.3em] text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
          />
          {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
          {ok ? (
            <p className="text-[11px] font-medium text-emerald-700">
              Premium activado para el hogar.
            </p>
          ) : null}
          <button
            type="button"
            disabled={isPending || code.length !== 6}
            onClick={() => {
              setError("");
              setOk(false);
              startTransition(async () => {
                try {
                  await activatePremiumByInviteCodeAction(code);
                  setOk(true);
                  window.setTimeout(() => window.location.reload(), 600);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "No se pudo activar.");
                }
              });
            }}
            className="w-full rounded-full bg-primary px-3 py-2.5 text-xs font-semibold text-on-primary disabled:opacity-50"
          >
            {isPending ? "Activando…" : "Confirmar código"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
