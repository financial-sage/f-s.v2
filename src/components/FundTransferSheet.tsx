"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeftRight, LoaderCircle } from "lucide-react";
import { transferBetweenFundsAction } from "@/app/actions/funds";
import {
  listVisibleFundsForUser,
  resolveFundColor,
  type FamilyFund,
} from "@/lib/funds";
import { tintedGlassGradient } from "@/lib/glass";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { Sheet } from "@/components/ui/Sheet";

interface FundTransferSheetProps {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  fromFundId: string | null;
  funds: FamilyFund[];
  onSuccess?: () => void | Promise<void>;
}

export default function FundTransferSheet({
  open,
  onClose,
  currentUserId,
  fromFundId,
  funds,
  onSuccess,
}: FundTransferSheetProps) {
  const [toFundId, setToFundId] = useState("");
  const [amount, setAmount] = useState("0");
  const [showKeypad, setShowKeypad] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const operableFunds = useMemo(
    () => listVisibleFundsForUser(funds, currentUserId),
    [funds, currentUserId]
  );

  const fromFund = useMemo(
    () => operableFunds.find((f) => f.id === fromFundId) ?? null,
    [operableFunds, fromFundId]
  );

  const destinations = useMemo(
    () => operableFunds.filter((f) => f.id !== fromFundId),
    [operableFunds, fromFundId]
  );

  const accent = resolveFundColor(fromFund);

  useEffect(() => {
    if (!open) return;
    setError("");
    setAmount("0");
    setShowKeypad(false);
    setToFundId((prev) => {
      if (prev && destinations.some((f) => f.id === prev)) return prev;
      return destinations[0]?.id ?? "";
    });
  }, [open, fromFundId, destinations]);

  function handleClose() {
    setShowKeypad(false);
    setError("");
    onClose();
  }

  function proceedToAmount() {
    if (!fromFundId || !toFundId) {
      setError("Elige un bolsillo destino.");
      return;
    }
    if (fromFundId === toFundId) {
      setError("Elige dos bolsillos distintos.");
      return;
    }
    setError("");
    setAmount("0");
    setShowKeypad(true);
  }

  function confirmTransfer(nextValue?: string) {
    const parsed = Number((nextValue ?? amount).replace(/,/g, ".").trim());
    if (!fromFundId || !toFundId || !Number.isFinite(parsed) || parsed <= 0) {
      setError("Ingresa un importe válido.");
      setShowKeypad(false);
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await transferBetweenFundsAction({
          fromFundId,
          toFundId,
          amount: parsed,
        });
        setShowKeypad(false);
        handleClose();
        await onSuccess?.();
      } catch (err) {
        setShowKeypad(false);
        setError(
          err instanceof Error ? err.message : "No se pudo completar la transferencia."
        );
      }
    });
  }

  const toFund = destinations.find((f) => f.id === toFundId) ?? null;

  return (
    <>
      <Sheet
        open={open}
        onClose={handleClose}
        title="Mover entre bolsillos"
        closeOnBackdrop
        heightClassName="h-auto max-h-[88dvh]"
      >
        <div className="flex flex-col gap-5 pb-2">
          <div className="text-center">
            <p className="text-[11px] font-light text-on-surface-variant">
              Mover entre bolsillos
            </p>
            <p className="mt-1 text-base font-medium tracking-tight text-on-surface">
              {fromFund?.name ?? "Bolsillo"}
            </p>
          </div>

          <div
            className="relative overflow-hidden rounded-[1.85rem] border border-glass-border p-4 shadow-[0_12px_28px_rgba(43,52,55,0.10)] backdrop-blur-xl"
            style={{
              backgroundImage: tintedGlassGradient(accent, {
                soft: true,
                midAlpha: "18",
                endAlpha: "28",
                midStop: 55,
              }),
            }}
          >
            <div className="relative z-10 flex items-center gap-2">
              <div className="min-w-0 flex-1 rounded-2xl bg-glass-soft/80 px-3 py-2.5 backdrop-blur-sm">
                <p className="text-[10px] font-light text-on-surface-variant">Desde</p>
                <p className="mt-0.5 truncate text-sm font-medium tracking-tight text-on-surface">
                  {fromFund?.name ?? "—"}
                </p>
              </div>
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${accent}22`, color: accent }}
              >
                <ArrowLeftRight size={14} />
              </div>
              <div className="min-w-0 flex-1 rounded-2xl bg-glass-soft/80 px-3 py-2.5 backdrop-blur-sm">
                <p className="text-[10px] font-light text-on-surface-variant">Hacia</p>
                <p className="mt-0.5 truncate text-sm font-medium tracking-tight text-on-surface">
                  {toFund?.name ?? "Elige…"}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 px-1 text-xs font-medium text-on-surface">¿Hacia dónde?</p>
            {destinations.length === 0 ? (
              <p className="rounded-[1.25rem] bg-glass-soft px-4 py-4 text-center text-xs font-light text-on-surface-variant">
                No hay otro bolsillo disponible.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {destinations.map((fund) => {
                  const selected = toFundId === fund.id;
                  const color = resolveFundColor(fund);
                  return (
                    <button
                      key={fund.id}
                      type="button"
                      onClick={() => setToFundId(fund.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all active:scale-[0.98] ${
                        selected
                          ? "border-transparent shadow-sm"
                          : "border-glass-border bg-glass text-on-surface-variant hover:bg-glass-strong"
                      }`}
                      style={
                        selected
                          ? {
                              backgroundImage: tintedGlassGradient(color, {
                                soft: true,
                                midAlpha: "28",
                                endOnly: true,
                              }),
                              borderColor: `${color}40`,
                              color,
                            }
                          : undefined
                      }
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: color }}
                      />
                      {fund.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="alert-error rounded-2xl px-3 py-2 text-xs">{error}</div>
          )}

          <button
            type="button"
            disabled={isPending || !fromFundId || !toFundId || destinations.length === 0}
            onClick={proceedToAmount}
            className="fab-ink inline-flex h-12 w-full items-center justify-center gap-2 rounded-[1.25rem] text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {isPending ? <LoaderCircle size={16} className="animate-spin" /> : null}
            Continuar
          </button>
        </div>
      </Sheet>

      <NumericKeypadSheet
        isOpen={showKeypad}
        title="TRANSFERIR"
        subtitle={
          fromFund && toFund ? `${fromFund.name} → ${toFund.name}` : undefined
        }
        accentColor={accent}
        initialValue={amount}
        onClose={() => setShowKeypad(false)}
        onValueChange={setAmount}
        onConfirm={confirmTransfer}
      />
    </>
  );
}
