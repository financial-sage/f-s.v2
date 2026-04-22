"use client";

import { ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { updateFamilyFinancialModel } from "@/app/actions/family";

type FinancialModel = "joint_fund" | "p2p_50_50" | "p2p_proportional";

interface FamilySettingsProps {
  familyId: string;
  initialModel?: string | null;
  initialSplitPct?: number | null;
  isUserOne?: boolean;
}

const MODEL_OPTIONS: Array<{ value: FinancialModel; label: string; description: string }> = [
  {
    value: "joint_fund",
    label: "Fondo Común (Bote compartido)",
    description: "Todos los gastos salen del mismo bote compartido.",
  },
  {
    value: "p2p_50_50",
    label: "A Medias (50/50)",
    description: "Cada persona asume el 50% de los gastos compartidos.",
  },
  {
    value: "p2p_proportional",
    label: "Proporcional a ingresos",
    description: "El reparto se ajusta según el porcentaje definido.",
  },
];

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return 50;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeModel(value?: string | null): FinancialModel {
  if (value === "p2p_50_50" || value === "p2p_proportional") {
    return value;
  }

  return "joint_fund";
}

export default function FamilySettings({
  familyId,
  initialModel,
  initialSplitPct,
  isUserOne = true,
}: FamilySettingsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [model, setModel] = useState<FinancialModel>(normalizeModel(initialModel));
  const [mySplitPct, setMySplitPct] = useState<number>(
    isUserOne
      ? clampPercentage(initialSplitPct ?? 50)
      : 100 - clampPercentage(initialSplitPct ?? 50)
  );
  const [message, setMessage] = useState<string>("");
  const [isError, setIsError] = useState(false);
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [isSheetAnimated, setIsSheetAnimated] = useState(false);

  useEffect(() => {
    setModel(normalizeModel(initialModel));
    setMySplitPct(
      isUserOne
        ? clampPercentage(initialSplitPct ?? 50)
        : 100 - clampPercentage(initialSplitPct ?? 50)
    );
  }, [initialModel, initialSplitPct, isUserOne]);

  const partnerSplitPct = useMemo(() => 100 - mySplitPct, [mySplitPct]);
  const summaryValue =
    model === "joint_fund" ? "Fondo Común" : model === "p2p_50_50" ? "50/50" : "Proporcional";

  function openFinancialModal() {
    setMessage("");
    setIsError(false);
    setIsFinancialModalOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setIsSheetAnimated(true)));
  }

  function closeFinancialModal() {
    setIsSheetAnimated(false);
    window.setTimeout(() => {
      setIsFinancialModalOpen(false);
    }, 250);
  }

  async function handleSave() {
    setMessage("");
    setIsError(false);

    const user1SplitToStore = isUserOne ? mySplitPct : 100 - mySplitPct;

    startTransition(async () => {
      const result = await updateFamilyFinancialModel(familyId, model, user1SplitToStore);

      if (result?.error) {
        setMessage(result.error);
        setIsError(true);
        return;
      }

      setMessage("Modelo financiero actualizado.");
      router.refresh();
      window.setTimeout(() => {
        closeFinancialModal();
      }, 250);
    });
  }

  return (
    <>
      <section className="overflow-hidden rounded-3xl bg-surface-lowest shadow-sm">
        <button
          type="button"
          onClick={openFinancialModal}
          className="flex w-full items-center justify-between px-4 py-4 text-left transition hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <p className="font-semibold text-on-surface">Modelo de Reparto</p>
              <p className="text-xs text-on-surface-variant">Gestiona cómo comparten gastos.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span>{summaryValue}</span>
            <ChevronRight size={16} />
          </div>
        </button>
      </section>

      {isFinancialModalOpen ? (
        <div className="fixed inset-0 z-80 flex flex-col justify-end">
          <div
            className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 ${
              isSheetAnimated ? "opacity-100" : "opacity-0"
            }`}
            onClick={closeFinancialModal}
          />

          <div
            className={`relative rounded-t-[2rem] bg-surface-lowest p-5 shadow-2xl transition-all duration-300 ${
              isSheetAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-on-surface">Modelo Financiero</h2>
                <p className="text-sm text-on-surface-variant">
                  Elige la forma en que quieren repartir los gastos.
                </p>
              </div>

              <button
                type="button"
                onClick={closeFinancialModal}
                className="rounded-full bg-slate-100 p-2 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {MODEL_OPTIONS.map((option) => {
                const isSelected = model === option.value;

                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                      isSelected ? "border-primary bg-primary/5" : "border-slate-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="financialModel"
                      value={option.value}
                      checked={isSelected}
                      onChange={() => setModel(option.value)}
                      className="mt-1 h-4 w-4 accent-[#4A6549]"
                    />
                    <div>
                      <p className="font-semibold text-on-surface">{option.label}</p>
                      <p className="text-sm text-on-surface-variant">{option.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>

            {model === "p2p_proportional" ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-on-surface">
                    Tú aportas el {mySplitPct}%, y tu pareja el {partnerSplitPct}%
                  </p>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={mySplitPct}
                    onChange={(e) => setMySplitPct(clampPercentage(Number(e.target.value)))}
                    className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center font-semibold text-on-surface outline-none focus:border-sage"
                  />
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={mySplitPct}
                  onChange={(e) => setMySplitPct(clampPercentage(Number(e.target.value)))}
                  className="mt-4 w-full accent-[#4A6549]"
                />
              </div>
            ) : null}

            {message ? (
              <div
                className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
                  isError ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {message}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="mt-4 w-full rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition hover:brightness-110 disabled:opacity-70"
            >
              {isPending ? "Guardando..." : "Guardar modelo"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
