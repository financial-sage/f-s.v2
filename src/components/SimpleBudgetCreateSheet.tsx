"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { FormattedCurrency } from "@/components/FormattedCurrency";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/components/ui/cn";
import type { FamilyAccount } from "@/lib/accounts";
import {
  newEnvelopeId,
  type BudgetGroup,
  type BudgetScope,
} from "@/lib/budgetEnvelopes";

type Step = 0 | 1 | 2;

type SimpleBudgetCreateSheetProps = {
  open: boolean;
  onClose: () => void;
  accounts: FamilyAccount[];
  defaultAccountId: string | null;
  /** Inherited from the active Presupuesto tab. */
  scope?: BudgetScope;
  ownerProfileId?: string | null;
  onCreate: (group: BudgetGroup) => void;
};

const STEP_PROMPT: Record<Step, string> = {
  0: "¿Cómo lo llamamos?",
  1: "¿Cuánto asignas?",
  2: "¿Desde qué cuenta?",
};

export default function SimpleBudgetCreateSheet({
  open,
  onClose,
  accounts,
  defaultAccountId,
  scope = "shared",
  ownerProfileId = null,
  onCreate,
}: SimpleBudgetCreateSheetProps) {
  const [step, setStep] = useState<Step>(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [name, setName] = useState("");
  const [amountDraft, setAmountDraft] = useState("0");
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [keypadOpen, setKeypadOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setDirection("forward");
    setName("");
    setAmountDraft("0");
    setAmount(0);
    setAccountId(defaultAccountId);
    setKeypadOpen(false);
  }, [open, defaultAccountId]);

  function goNext() {
    if (step === 0) {
      if (!name.trim()) return;
      setDirection("forward");
      setStep(1);
      return;
    }
    if (step === 1) {
      if (amount <= 0) return;
      setDirection("forward");
      setStep(2);
      return;
    }
    if (!accountId && accounts.length > 0) return;
    onCreate({
      id: newEnvelopeId(),
      name: name.trim() || "Presupuesto",
      amount: Math.round(amount * 100) / 100,
      segments: [],
      defaultAccountId: accountId,
      scope,
      ownerProfileId: scope === "personal" ? ownerProfileId : null,
    });
    onClose();
  }

  function goBack() {
    if (step === 0) return;
    setDirection("back");
    setStep((s) => (s - 1) as Step);
  }

  function confirmAmount(value?: string) {
    const normalized = Number(String(value ?? amountDraft).replace(/,/g, "."));
    if (!Number.isFinite(normalized) || normalized < 0) {
      setKeypadOpen(false);
      return;
    }
    const rounded = Math.round(normalized * 100) / 100;
    setAmount(rounded);
    setAmountDraft(rounded > 0 ? String(rounded) : "0");
    setKeypadOpen(false);
  }

  const trimmedName = name.trim();
  const canProceed =
    step === 0
      ? trimmedName.length > 0
      : step === 1
        ? amount > 0
        : accounts.length === 0 || Boolean(accountId);

  const cta = step === 2 ? "Crear" : "Siguiente";
  const progress = ((step + 1) / 3) * 100;

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Nuevo presupuesto"
        closeOnBackdrop
        heightClassName="h-auto max-h-[85dvh]"
      >
        <div className="flex flex-col gap-4 pb-1 pt-0.5">
          <header className="space-y-2.5">
            <div className="flex items-center gap-2">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-on-surface-variant/70 transition-colors hover:bg-on-surface/[0.04] hover:text-on-surface"
                  aria-label="Atrás"
                >
                  <ArrowLeft size={15} strokeWidth={1.6} />
                </button>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-light uppercase tracking-[0.14em] text-on-surface-variant/75">
                  Nuevo presupuesto
                  <span className="ml-1.5 tabular-nums text-outline-variant">
                    {step + 1}/3
                  </span>
                </p>
                <h2 className="mt-0.5 text-[15px] font-medium tracking-tight text-on-surface">
                  {STEP_PROMPT[step]}
                </h2>
              </div>
            </div>

            <div
              className="h-px w-full overflow-hidden bg-outline-variant/12"
              aria-hidden
            >
              <div
                className="h-full bg-primary/70 transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ width: `${progress}%` }}
              />
            </div>

            {step > 0 && trimmedName ? (
              <p className="animate-in fade-in duration-200 text-[11px] font-light text-on-surface-variant">
                <span className="text-on-surface/75">{trimmedName}</span>
                {step === 2 && amount > 0 ? (
                  <>
                    {" · "}
                    <span className="tabular-nums">
                      <FormattedCurrency value={amount} />
                    </span>
                  </>
                ) : null}
              </p>
            ) : null}
          </header>

          <div className="relative min-h-[5.5rem] overflow-hidden">
            <div
              key={step}
              className={cn(
                "animate-in fade-in duration-200 fill-mode-both",
                direction === "forward"
                  ? "slide-in-from-right-3"
                  : "slide-in-from-left-3",
              )}
            >
              {step === 0 ? (
                <label className="block">
                  <span className="sr-only">Nombre del presupuesto</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canProceed) goNext();
                    }}
                    autoFocus
                    placeholder="Comida, transporte, ocio…"
                    className="w-full border-0 border-b border-outline-variant/20 bg-transparent px-0.5 pb-2.5 pt-1 text-[1.15rem] font-light tracking-tight text-on-surface outline-none transition-[border-color] placeholder:text-outline-variant/65 focus:border-primary/40"
                  />
                </label>
              ) : null}

              {step === 1 ? (
                <div className="flex flex-col items-center py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAmountDraft(amount > 0 ? String(amount) : "0");
                      setKeypadOpen(true);
                    }}
                    className="px-2 py-1 transition-opacity active:opacity-70"
                    aria-label="Introducir importe"
                  >
                    <span
                      className={cn(
                        "text-[2rem] tracking-tight tabular-nums",
                        amount > 0
                          ? "font-medium text-on-surface"
                          : "font-light text-outline-variant",
                      )}
                    >
                      {amount > 0 ? (
                        <FormattedCurrency value={amount} />
                      ) : (
                        "0,00"
                      )}
                    </span>
                  </button>
                  <p className="mt-1 text-[11px] font-light text-on-surface-variant/70">
                    Pulsa para editar
                  </p>
                </div>
              ) : null}

              {step === 2 ? (
                accounts.length === 0 ? (
                  <p className="py-6 text-center text-[12px] font-light text-on-surface-variant">
                    No hay cuentas disponibles para vincular.
                  </p>
                ) : (
                  <ul className="-mx-1">
                    {accounts.map((account) => {
                      const selected = accountId === account.id;
                      return (
                        <li
                          key={account.id}
                          className="border-b border-outline-variant/10 last:border-b-0"
                        >
                          <button
                            type="button"
                            onClick={() => setAccountId(account.id)}
                            className="flex w-full items-center gap-2.5 px-1 py-2.5 text-left transition-colors hover:bg-on-surface/[0.02]"
                          >
                            <span
                              className={cn(
                                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                                selected
                                  ? "border-primary/60 bg-primary text-on-primary"
                                  : "border-outline-variant/35 text-transparent",
                              )}
                              aria-hidden
                            >
                              <Check size={9} strokeWidth={2.5} />
                            </span>
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-[13px] tracking-tight",
                                selected
                                  ? "font-medium text-on-surface"
                                  : "font-light text-on-surface/80",
                              )}
                            >
                              {account.name}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : null}
            </div>
          </div>

          <Button
            type="button"
            onClick={goNext}
            disabled={!canProceed}
            className="fab-ink flex h-11 w-full rounded-2xl text-sm font-semibold shadow-none disabled:opacity-40"
          >
            {cta}
          </Button>
        </div>
      </Sheet>

      <NumericKeypadSheet
        isOpen={keypadOpen}
        title={trimmedName || "Importe"}
        subtitle="Importe del presupuesto"
        initialValue={amountDraft}
        onClose={() => setKeypadOpen(false)}
        onValueChange={setAmountDraft}
        onConfirm={confirmAmount}
      />
    </>
  );
}
