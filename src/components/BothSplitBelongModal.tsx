"use client";

import { Heart, Home, User, X } from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import { resolveFundColor, type FamilyFund } from "@/lib/funds";
import { tintedGlassGradient } from "@/lib/glass";

export type BothSplitBelongChoice = "each_personal" | "joint_fund";

type Props = {
  open: boolean;
  partnerFirstName: string;
  sharedFunds: FamilyFund[];
  choice: BothSplitBelongChoice;
  fundId: string | null;
  confirming?: boolean;
  onChoiceChange: (choice: BothSplitBelongChoice) => void;
  onFundChange: (fundId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export default function BothSplitBelongModal({
  open,
  partnerFirstName,
  sharedFunds,
  choice,
  fundId,
  confirming = false,
  onChoiceChange,
  onFundChange,
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;

  const canConfirm =
    choice === "each_personal" ||
    (choice === "joint_fund" && Boolean(fundId) && sharedFunds.length > 0);

  return (
    <Portal>
      <div className="fixed inset-0 z-[230] flex items-end justify-center p-3 sm:items-center sm:p-4">
        <button
          type="button"
          className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          aria-label="Cerrar"
          onClick={onClose}
          disabled={confirming}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="both-split-belong-title"
          className="relative z-[1] w-full max-w-md overflow-hidden rounded-[1.85rem] border border-glass-border bg-surface-lowest shadow-[var(--glass-shadow-lg)] animate-in fade-in slide-in-from-bottom-4 duration-300 sm:slide-in-from-bottom-0 sm:zoom-in-95"
        >
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="absolute right-3 top-3 z-10 rounded-full p-2 text-on-surface-variant/80 transition-colors hover:bg-on-surface/[0.05] hover:text-on-surface disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X size={16} strokeWidth={1.75} />
          </button>

          <div className="relative px-5 pb-5 pt-7">
            <p className="text-[11px] font-light tracking-[0.14em] text-on-surface-variant/80">
              Mitad y mitad
            </p>
            <h2
              id="both-split-belong-title"
              className="mt-2 max-w-[22ch] text-[1.35rem] font-light leading-snug tracking-tight text-on-surface"
            >
              ¿A quién pertenece este gasto?
            </h2>
            <p className="mt-2 text-[13px] font-light leading-relaxed text-on-surface-variant">
              Cada uno pone su parte. Elige si va al bolsillo personal de cada
              uno o a un bolsillo compartido (por ejemplo restaurantes).
            </p>

            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => onChoiceChange("each_personal")}
                className={`flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
                  choice === "each_personal"
                    ? "border-primary/40 bg-primary/10"
                    : "border-outline-variant/25 bg-surface-low/80 hover:bg-surface-container"
                }`}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-lowest text-on-surface shadow-sm">
                  <User size={16} strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium text-on-surface">
                    Personal de cada uno
                  </span>
                  <span className="mt-0.5 block text-[12px] font-light leading-snug text-on-surface-variant">
                    Tu parte a tu bolsillo; la de {partnerFirstName} al suyo.
                  </span>
                </span>
                {choice === "each_personal" ? (
                  <Heart
                    size={14}
                    className="mt-1 shrink-0 text-primary"
                    strokeWidth={1.75}
                  />
                ) : null}
              </button>

              <button
                type="button"
                onClick={() => onChoiceChange("joint_fund")}
                disabled={sharedFunds.length === 0}
                className={`flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors disabled:opacity-50 ${
                  choice === "joint_fund"
                    ? "border-primary/40 bg-primary/10"
                    : "border-outline-variant/25 bg-surface-low/80 hover:bg-surface-container"
                }`}
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-lowest text-on-surface shadow-sm">
                  <Home size={16} strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium text-on-surface">
                    Bolsillo compartido
                  </span>
                  <span className="mt-0.5 block text-[12px] font-light leading-snug text-on-surface-variant">
                    Ambos aportan y el gasto se carga a un bolsillo conjunto.
                  </span>
                </span>
              </button>
            </div>

            {choice === "joint_fund" ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {sharedFunds.length === 0 ? (
                  <p className="text-[12px] font-light text-on-surface-variant">
                    No hay bolsillos compartidos todavía.
                  </p>
                ) : (
                  sharedFunds.map((fund) => {
                    const isSelected = fundId === fund.id;
                    const fundColor = resolveFundColor(fund);
                    return (
                      <button
                        key={fund.id}
                        type="button"
                        onClick={() => onFundChange(fund.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm transition-all ${
                          isSelected
                            ? "text-on-surface"
                            : "border-glass-border bg-surface-low text-on-surface/65"
                        }`}
                        style={
                          isSelected
                            ? {
                                backgroundImage: tintedGlassGradient(fundColor, {
                                  midAlpha: "28",
                                  endOnly: true,
                                }),
                                borderColor: `${fundColor}55`,
                                color: fundColor,
                              }
                            : undefined
                        }
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10"
                          style={{ backgroundColor: fundColor }}
                        />
                        {fund.name}
                      </button>
                    );
                  })
                )}
              </div>
            ) : null}

            <button
              type="button"
              disabled={!canConfirm || confirming}
              onClick={onConfirm}
              className="mt-5 flex w-full items-center justify-center rounded-2xl bg-primary py-2.5 text-[13px] font-semibold text-on-primary transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {confirming ? "Guardando…" : "Confirmar y guardar"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
