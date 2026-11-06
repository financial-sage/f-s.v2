"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { ArrowLeft, Check, Loader2, Plus, ScanLine, Tags } from "lucide-react";
import CustomNumpad from "@/components/CustomNumpad";
import { FormattedCurrency } from "@/components/FormattedCurrency";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/components/ui/cn";
import { categorizeExpenseWithAI } from "@/app/actions/categorizeExpense";
import { saveExpenseAction } from "@/app/actions/expenses";
import { scanReceiptWithAI } from "@/app/actions/scanReceipt";
import { useExpenseModal } from "@/components/ExpenseModalProvider";
import { useBudget } from "@/hooks/useBudget";
import { toast } from "@/hooks/useToast";
import { useCurrency } from "@/hooks/useCurrency";
import { listPayableAccountsForUser } from "@/lib/accounts";
import { getMonthKey } from "@/lib/budget";
import {
  filterBudgetGroupsForScope,
  flattenEnvelopeGroups,
  newEnvelopeId,
  readMonthEnvelopePlan,
  resolveDefaultAccountIdForCategory,
  writeMonthEnvelopePlan,
  type BudgetScope,
} from "@/lib/budgetEnvelopes";
import { formatCurrency } from "@/lib/currency";
import { listVisibleCategories } from "@/lib/familyCategories";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useCategoriesStore } from "@/store/useCategoriesStore";
import { useExpenseStore } from "@/store/useExpenseStore";

type Step = 1 | 2 | 3;

type SimpleExpenseSheetProps = {
  open: boolean;
  onClose: () => void;
};

const STEP_PROMPT: Record<Step, string> = {
  1: "¿Cuánto has gastado?",
  2: "¿En qué lo has gastado?",
  3: "Confirma y guarda",
};

function todayISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Most common envelope default account, if any. */
function resolveHabitualAccountId(
  familyId: string | null,
  payableIds: Set<string>,
  fallbackId: string | null,
): string | null {
  if (!familyId) return fallbackId;
  const plan = readMonthEnvelopePlan(familyId, getMonthKey());
  const counts = new Map<string, number>();
  for (const group of plan?.groups ?? []) {
    const id = group.defaultAccountId?.trim();
    if (!id || !payableIds.has(id)) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best ?? fallbackId;
}

export default function SimpleExpenseSheet({
  open,
  onClose,
}: SimpleExpenseSheetProps) {
  const { currency } = useCurrency();
  const { expenseDraft, setExpenseDraft } = useExpenseModal();
  const userId = useExpenseStore((s) => s.userId);
  const familyId = useExpenseStore((s) => s.familyId);
  const refreshData = useExpenseStore((s) => s.refreshData);

  const categories = useCategoriesStore((s) => s.categories);
  const loadCategories = useCategoriesStore((s) => s.load);

  const accounts = useAccountsStore((s) => s.accounts);
  const loadAccounts = useAccountsStore((s) => s.load);

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [amount, setAmount] = useState(0);
  const [amountDraft, setAmountDraft] = useState("0");
  /** When editing amount from confirm, keypad confirm returns here. */
  const [amountReturnStep, setAmountReturnStep] = useState<Step | null>(null);
  const [concept, setConcept] = useState("");
  const [paidAccountId, setPaidAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCategory, setScannedCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [suggestedBudgetName, setSuggestedBudgetName] = useState<string | null>(
    null,
  );
  const [budgetListTick, setBudgetListTick] = useState(0);

  const { setMonthLimits } = useBudget(familyId ?? "");

  const conceptRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRefs = useRef<Array<HTMLDivElement | null>>([null, null, null]);
  const [carouselHeight, setCarouselHeight] = useState<number | null>(null);

  const payableAccounts = useMemo(() => {
    if (!userId) return [];
    return listPayableAccountsForUser(accounts, userId);
  }, [accounts, userId]);

  const primaryAccount = useMemo(() => {
    const personal = payableAccounts.find((a) => a.scope === "personal");
    return personal ?? payableAccounts[0] ?? null;
  }, [payableAccounts]);

  const habitualAccountId = useMemo(() => {
    const payableIds = new Set(payableAccounts.map((a) => a.id));
    return resolveHabitualAccountId(
      familyId,
      payableIds,
      primaryAccount?.id ?? null,
    );
  }, [familyId, payableAccounts, primaryAccount]);

  const selectedPaidAccount = useMemo(
    () => payableAccounts.find((a) => a.id === paidAccountId) ?? null,
    [payableAccounts, paidAccountId],
  );

  /** Account configured on the selected budget group (if any). */
  const budgetDefaultAccountId = useMemo(() => {
    if (!familyId || !scannedCategory) return null;
    void budgetListTick;
    const plan = readMonthEnvelopePlan(familyId, getMonthKey());
    const payableIds = new Set(payableAccounts.map((a) => a.id));
    const resolved = resolveDefaultAccountIdForCategory(plan, {
      categoryId: scannedCategory.id,
      categoryName: scannedCategory.name,
    });
    if (!resolved || !payableIds.has(resolved)) return null;
    return resolved;
  }, [familyId, scannedCategory, budgetListTick, payableAccounts]);

  /** Only when paying a budget with a cuenta distinta a la de ese presupuesto. */
  const isAdvance =
    Boolean(paidAccountId) &&
    Boolean(budgetDefaultAccountId) &&
    paidAccountId !== budgetDefaultAccountId;

  const fallbackCategories = useMemo(() => {
    if (!userId) return [];
    return listVisibleCategories(categories, userId).map((c) => ({
      id: c.id,
      name: c.name,
    }));
  }, [categories, userId]);

  function envelopeLeafCategories() {
    if (!familyId) return [];
    void budgetListTick;
    const plan = readMonthEnvelopePlan(familyId, getMonthKey());
    const visible = [
      ...filterBudgetGroupsForScope(plan?.groups ?? [], "shared", userId),
      ...filterBudgetGroupsForScope(plan?.groups ?? [], "personal", userId),
    ];
    const leaves: Array<{ id: string; name: string }> = [];
    for (const group of visible) {
      if (group.segments.length > 0) {
        for (const seg of group.segments) {
          leaves.push({ id: seg.id, name: seg.name });
        }
      } else {
        leaves.push({ id: group.id, name: group.name });
      }
    }
    return leaves;
  }

  const budgetLeaves = useMemo(
    () => envelopeLeafCategories(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick + family refresh list
    [familyId, budgetListTick],
  );

  const [formEpoch, setFormEpoch] = useState(0);

  useEffect(() => {
    if (!open) return;
    const draft = expenseDraft;
    const draftAmount =
      draft?.amount != null && Number.isFinite(draft.amount) && draft.amount > 0
        ? Math.round(Number(draft.amount) * 100) / 100
        : 0;
    const draftCategory =
      draft?.categoryId && draft?.categoryName
        ? { id: draft.categoryId, name: draft.categoryName }
        : draft?.categoryName
          ? { id: draft.categoryId ?? draft.categoryName, name: draft.categoryName }
          : null;

    setAmount(draftAmount);
    setAmountDraft(draftAmount > 0 ? String(draftAmount) : "0");
    setConcept(draft?.concept?.trim() || draftCategory?.name || "");
    setPaidAccountId(draft?.paidAccountId ?? null);
    setError(null);
    setIsScanning(false);
    setScannedCategory(draftCategory);
    setSuggestedBudgetName(null);
    setAmountReturnStep(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const stepFromDraft = draft?.initialStep;
    const nextStep: Step =
      stepFromDraft ??
      (draftAmount > 0 && draftCategory
        ? 3
        : draftAmount > 0
          ? 2
          : 1);
    setCurrentStep(nextStep);
    setFormEpoch((n) => n + 1);

    if (draft) setExpenseDraft(null);
    void loadCategories();
    void loadAccounts();
    // Only re-seed when the sheet opens; draft is consumed once.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open edge
  }, [open, loadCategories, loadAccounts]);

  // Seed default origin after open (and again if accounts hydrate with no selection yet).
  useEffect(() => {
    if (!open || formEpoch === 0) return;
    setPaidAccountId((prev) => {
      if (prev) return prev;
      return habitualAccountId ?? primaryAccount?.id ?? null;
    });
  }, [open, formEpoch, habitualAccountId, primaryAccount?.id]);

  useEffect(() => {
    if (!open || currentStep !== 2) return;
    const timer = window.setTimeout(() => {
      conceptRef.current?.focus();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open, currentStep]);

  // Sheet height follows the active step (step 1 keypad is tall; concept is compact).
  useEffect(() => {
    if (!open) {
      setCarouselHeight(null);
      return;
    }
    const measure = () => {
      const panel = panelRefs.current[currentStep - 1];
      if (!panel) return;
      setCarouselHeight(panel.offsetHeight);
    };
    measure();
    const timer = window.setTimeout(measure, 40);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", measure);
    };
  }, [
    open,
    currentStep,
    amount,
    concept,
    payableAccounts.length,
    isAdvance,
    error,
    isScanning,
    suggestedBudgetName,
    scannedCategory,
    budgetListTick,
  ]);

  function availableCategories() {
    const envelopeLeaves = envelopeLeafCategories();
    return envelopeLeaves.length > 0 ? envelopeLeaves : fallbackCategories;
  }

  function goToStep(step: Step) {
    setError(null);
    setCurrentStep(step);
  }

  function openReceiptPicker() {
    if (isScanning) return;
    fileInputRef.current?.click();
  }

  async function handleReceiptSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const categoriasDisponibles = availableCategories();
    if (categoriasDisponibles.length === 0) {
      toast({
        title: "❌ No pudimos leer el ticket",
        description: "Configura presupuestos o categorías antes de escanear.",
      });
      return;
    }

    setIsScanning(true);
    setError(null);

    try {
      // Phone photos are often several MB — compress before the server action
      // or Next resets the connection (ERR_CONNECTION_RESET / body too large).
      const { prepareReceiptImage } = await import(
        "@/lib/receipts/prepare-image"
      );
      const prepared = await prepareReceiptImage(file);

      const formData = new FormData();
      formData.append("image", prepared);
      const result = await scanReceiptWithAI(formData, categoriasDisponibles);

      const rounded = Math.round(Number(result.importe) * 100) / 100;
      if (!(rounded > 0)) {
        throw new Error("Importe inválido");
      }

      setAmount(rounded);
      setAmountDraft(String(rounded));
      setConcept(result.concepto?.trim() || "Ticket");
      setScannedCategory(
        result.categoryId && result.categoryName
          ? { id: result.categoryId, name: result.categoryName }
          : null,
      );
      setSuggestedBudgetName(
        result.categoryId
          ? null
          : result.suggestedCategoryName?.trim() || null,
      );
      goToStep(3);
    } catch (err) {
      console.warn(
        "[SimpleExpenseSheet] scan failed",
        err instanceof Error ? err.message : err,
      );
      const detail =
        err instanceof Error && err.message.trim() ? err.message.trim() : null;
      toast({
        title:
          "❌ No pudimos leer el ticket. Intenta ingresar el importe manualmente.",
        description: detail ?? undefined,
      });
    } finally {
      setIsScanning(false);
    }
  }

  function applyAmountFromDraft(raw?: string) {
    const next = Number(String(raw ?? amountDraft).replace(/,/g, "."));
    if (!Number.isFinite(next) || next < 0) {
      setError("Importe no válido.");
      return 0;
    }
    const rounded = Math.round(next * 100) / 100;
    setAmount(rounded);
    setAmountDraft(rounded > 0 ? String(rounded) : "0");
    setError(null);
    return rounded;
  }

  function goNextFromAmount(raw?: string) {
    const value = applyAmountFromDraft(raw);
    if (!(value > 0)) {
      setError("Indica un importe.");
      return;
    }
    if (amountReturnStep != null) {
      const next = amountReturnStep;
      setAmountReturnStep(null);
      goToStep(next);
      return;
    }
    goToStep(2);
  }

  function goNextFromConcept() {
    goToStep(3);
  }

  function openAmountEditor() {
    setAmountReturnStep(currentStep === 3 ? 3 : null);
    setAmountDraft(amount > 0 ? String(amount) : "0");
    goToStep(1);
  }

  function goBack() {
    if (currentStep === 1 && amountReturnStep != null) {
      const next = amountReturnStep;
      setAmountReturnStep(null);
      goToStep(next);
      return;
    }
    if (currentStep === 1) return;
    goToStep((currentStep - 1) as Step);
  }

  function createSuggestedBudget() {
    if (!familyId || !suggestedBudgetName?.trim()) return;
    const name = suggestedBudgetName.trim().slice(0, 40);
    const monthKey = getMonthKey();
    const existing = readMonthEnvelopePlan(familyId, monthKey);
    const accountId = paidAccountId ?? habitualAccountId ?? null;
    const account = payableAccounts.find((a) => a.id === accountId);
    const scope: BudgetScope =
      account?.scope === "personal" ? "personal" : "shared";
    const already = (existing?.groups ?? []).some(
      (g) =>
        g.name.trim().toLowerCase() === name.toLowerCase() &&
        (g.scope ?? "shared") === scope,
    );
    if (already) {
      const match = (existing?.groups ?? []).find(
        (g) =>
          g.name.trim().toLowerCase() === name.toLowerCase() &&
          (g.scope ?? "shared") === scope,
      );
      if (match) {
        setScannedCategory({ id: match.id, name: match.name });
        setSuggestedBudgetName(null);
      }
      return;
    }

    const starter = Math.max(
      50,
      Math.ceil((Math.max(amount, 1) * 4) / 10) * 10,
    );
    const group = {
      id: newEnvelopeId(),
      name,
      amount: starter,
      segments: [],
      defaultAccountId: accountId,
      scope,
      ownerProfileId: scope === "personal" ? userId : null,
    };
    const nextGroups = [...(existing?.groups ?? []), group];
    const accountIds =
      existing?.accountIds?.length
        ? existing.accountIds
        : payableAccounts.map((a) => a.id);

    writeMonthEnvelopePlan(familyId, monthKey, {
      accountIds,
      groups: nextGroups,
    });
    setMonthLimits(monthKey, flattenEnvelopeGroups(nextGroups));
    setScannedCategory({ id: group.id, name: group.name });
    setSuggestedBudgetName(null);
    setBudgetListTick((n) => n + 1);
    toast({
      title: `Presupuesto «${name}» creado`,
      description: `Asignamos ${formatCurrency(starter, currency)} este mes · puedes ajustarlo en Presupuesto`,
    });
  }

  function handleSave() {
    if (!(amount > 0)) {
      setError("Indica un importe.");
      goToStep(1);
      return;
    }

    const categoriasDisponibles = availableCategories();

    if (categoriasDisponibles.length === 0) {
      setError("Configura presupuestos en Presupuesto o crea una categoría.");
      return;
    }

    if (payableAccounts.length > 0 && !paidAccountId) {
      setError("Elige la cuenta origen.");
      return;
    }

    const savedAmount = amount;
    const savedConcept = concept.trim();
    const money = formatCurrency(savedAmount, currency);
    const monthKey = getMonthKey();
    const envelopePlan =
      familyId != null ? readMonthEnvelopePlan(familyId, monthKey) : null;
    const accountsSnapshot = payableAccounts;
    const fallbackAccount = primaryAccount;
    const paidOverrideId = paidAccountId;
    const knownCategory = scannedCategory;

    onClose();

    void (async () => {
      try {
        const classification =
          knownCategory != null
            ? {
                categoryId: knownCategory.id,
                categoryName: knownCategory.name,
              }
            : await categorizeExpenseWithAI({
                concepto: savedConcept || "Sin concepto",
                importe: savedAmount,
                categoriasDisponibles,
              });

        const mappedAccountId = resolveDefaultAccountIdForCategory(
          envelopePlan,
          {
            categoryId: classification.categoryId,
            categoryName: classification.categoryName,
          },
        );

        const budgetAccount =
          accountsSnapshot.find((a) => a.id === mappedAccountId) ??
          fallbackAccount;

        if (!budgetAccount) {
          throw new Error(
            "No hay una cuenta líquida para descontar el gasto. Crea una en Cuentas.",
          );
        }

        const paidAccount = paidOverrideId
          ? (accountsSnapshot.find((a) => a.id === paidOverrideId) ??
            budgetAccount)
          : budgetAccount;

        await saveExpenseAction({
          amount: savedAmount,
          concept: savedConcept || "Gasto",
          paidBy: "me",
          responsibleFor: "me",
          payerSharePct: 100,
          category: classification.categoryName,
          categoryId: classification.categoryId,
          date: todayISODate(),
          accountId: paidAccount.id,
          budgetAccountId: budgetAccount.id,
          paidFromAccount: true,
          paidFromFund: false,
          fundId: null,
          splitTypeOverride: "personal",
        });

        await refreshData();

        const isCrossPay = paidAccount.id !== budgetAccount.id;
        toast({
          title: isCrossPay
            ? `✅ ${money} en ${classification.categoryName} (Pagado con ${paidAccount.name} • Presupuesto ${budgetAccount.name})`
            : `✅ ${money} en ${classification.categoryName}`,
          description: isCrossPay
            ? savedConcept || undefined
            : `Desde ${paidAccount.name}${
                savedConcept ? ` · ${savedConcept}` : ""
              }`,
          action: {
            label: "Cambiar",
            onClick: () => {
              console.log("Abrir modal de edición de categoría");
            },
          },
        });
      } catch (err) {
        console.warn(
          "[SimpleExpenseSheet] classify/save failed",
          err instanceof Error ? err.message : err,
        );
        toast({
          title: "❌ No se pudo guardar el gasto",
          description:
            err instanceof Error
              ? err.message
              : "Inténtalo de nuevo en unos segundos.",
        });
      }
    })();
  }

  const progress = (currentStep / 3) * 100;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Nuevo gasto"
      closeOnBackdrop={!isScanning}
      closeDisabled={isScanning}
      heightClassName="h-auto max-h-[92dvh]"
    >
      <div className="flex flex-col gap-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-0.5">
        <header className="space-y-2.5">
          <div className="flex items-center gap-2">
            {currentStep > 1 || amountReturnStep != null ? (
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
                Nuevo gasto
                <span className="ml-1.5 tabular-nums text-outline-variant">
                  {currentStep}/3
                </span>
              </p>
              <h2 className="mt-0.5 text-[15px] font-medium tracking-tight text-on-surface">
                {STEP_PROMPT[currentStep]}
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
        </header>

        <div
          className="relative overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={
            carouselHeight != null ? { height: carouselHeight } : undefined
          }
        >
          <div
            className="flex items-start ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform: `translateX(-${(currentStep - 1) * 100}%)`,
              transitionProperty: "transform",
              transitionDuration: "400ms",
            }}
          >
            {/* Step 1 — amount + keypad */}
            <div
              ref={(el) => {
                panelRefs.current[0] = el;
              }}
              className="w-full shrink-0 px-0.5"
            >
              <div className="flex flex-col gap-3">
                <CustomNumpad
                  isOpen={open && currentStep === 1}
                  embedded
                  embeddedStyle="flat"
                  initialValue={amountDraft}
                  onClose={() => {
                    setAmount(0);
                    setAmountDraft("0");
                    setError(null);
                  }}
                  onValueChange={(value) => {
                    setAmountDraft(value);
                    const n = Number(String(value).replace(/,/g, "."));
                    if (Number.isFinite(n) && n >= 0) {
                      setAmount(Math.round(n * 100) / 100);
                      setError(null);
                    }
                  }}
                  onConfirm={(value) => goNextFromAmount(value)}
                />

                {error && currentStep === 1 ? (
                  <p className="text-center text-[11px] font-light text-balance-negative">
                    {error}
                  </p>
                ) : null}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => void handleReceiptSelected(event)}
                />

                <button
                  type="button"
                  disabled={isScanning}
                  onClick={openReceiptPicker}
                  className="mx-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-outline-variant/25 bg-on-surface/[0.03] px-4 py-2.5 text-[13px] font-medium text-on-surface transition-colors hover:border-outline-variant/40 hover:bg-on-surface/[0.05] disabled:opacity-60"
                >
                  {isScanning ? (
                    <Loader2
                      size={16}
                      strokeWidth={1.75}
                      className="animate-spin"
                      aria-hidden
                    />
                  ) : (
                    <ScanLine size={16} strokeWidth={1.75} aria-hidden />
                  )}
                  {isScanning ? "Leyendo ticket con IA…" : "Escanear ticket"}
                </button>
              </div>
            </div>

            {/* Step 2 — concept */}
            <div
              ref={(el) => {
                panelRefs.current[1] = el;
              }}
              className="w-full shrink-0 px-0.5"
            >
              <div className="flex flex-col gap-3 pb-1">
                <label className="block">
                  <span className="sr-only">Concepto del gasto</span>
                  <input
                    ref={conceptRef}
                    type="text"
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        goNextFromConcept();
                      }
                    }}
                    placeholder="Café, supermercado, transporte…"
                    autoComplete="off"
                    enterKeyHint="next"
                    className="w-full border-0 border-b border-outline-variant/20 bg-transparent px-0.5 pb-2.5 pt-1 text-[1.25rem] font-light tracking-tight text-on-surface outline-none transition-[border-color] placeholder:text-outline-variant/60 focus:border-primary/40"
                  />
                </label>

                <p className="text-[11px] font-light text-on-surface-variant">
                  Opcional — la IA lo usará para clasificar el gasto.
                </p>

                <Button
                  type="button"
                  onClick={goNextFromConcept}
                  className="fab-ink mt-1 flex h-11 w-full rounded-2xl text-sm font-semibold shadow-none"
                >
                  Continuar
                </Button>
              </div>
            </div>

            {/* Step 3 — confirm + account */}
            <div
              ref={(el) => {
                panelRefs.current[2] = el;
              }}
              className="w-full shrink-0 px-0.5"
            >
              <div className="flex flex-col gap-4">
                <div className="rounded-2xl border border-outline-variant/15 bg-on-surface/[0.02] px-4 py-3.5">
                  <p className="text-[10px] font-light uppercase tracking-[0.12em] text-on-surface-variant">
                    Resumen
                  </p>
                  <button
                    type="button"
                    onClick={openAmountEditor}
                    className="mt-1.5 w-full rounded-xl text-left transition-opacity hover:opacity-80 active:opacity-70"
                    aria-label="Editar importe"
                  >
                    <p className="text-[1.65rem] font-medium tracking-tight tabular-nums text-on-surface">
                      <FormattedCurrency value={amount} />
                    </p>
                    <p className="mt-1 text-[11px] font-light text-on-surface-variant">
                      Si el valor es distinto, pulsa para editar
                    </p>
                  </button>
                  <p className="mt-2 truncate text-[13px] font-light text-on-surface-variant">
                    {concept.trim() || "Sin concepto"}
                  </p>
                  {scannedCategory ? (
                    <p className="mt-1.5 text-[11px] font-light text-on-surface-variant">
                      Presupuesto · {scannedCategory.name}
                    </p>
                  ) : null}
                </div>

                {suggestedBudgetName && !scannedCategory ? (
                  <div className="rounded-2xl border border-outline-variant/20 bg-on-surface/[0.02] px-3.5 py-3">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-primary">
                        <Tags size={13} strokeWidth={1.6} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium tracking-tight text-on-surface">
                          ¿Crear presupuesto «{suggestedBudgetName}»?
                        </p>
                        <p className="mt-0.5 text-[11px] font-light text-on-surface-variant">
                          No encontramos uno que encaje con este ticket.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={createSuggestedBudget}
                        className="fab-ink h-9 flex-1 rounded-xl text-[12px] font-semibold shadow-none"
                      >
                        <Plus size={14} strokeWidth={2} className="mr-1" aria-hidden />
                        Crear y usar
                      </Button>
                      <button
                        type="button"
                        onClick={() => setSuggestedBudgetName(null)}
                        className="h-9 shrink-0 rounded-xl px-3 text-[12px] font-light text-on-surface-variant transition-colors hover:text-on-surface"
                      >
                        Ahora no
                      </button>
                    </div>
                  </div>
                ) : null}

                {budgetLeaves.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-[11px] font-light text-on-surface-variant">
                      Presupuesto
                    </p>
                    <ul className="-mx-1 max-h-36 overflow-y-auto">
                      {budgetLeaves.map((leaf) => {
                        const selected = scannedCategory?.id === leaf.id;
                        return (
                          <li
                            key={leaf.id}
                            className="border-b border-outline-variant/10 last:border-b-0"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setScannedCategory({
                                  id: leaf.id,
                                  name: leaf.name,
                                });
                                setSuggestedBudgetName(null);
                              }}
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
                                {leaf.name}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                {payableAccounts.length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-[11px] font-light text-on-surface-variant">
                      Cuenta origen
                    </p>
                    <ul className="-mx-1">
                      {payableAccounts.map((account) => {
                        const selected = paidAccountId === account.id;
                        return (
                          <li
                            key={account.id}
                            className="border-b border-outline-variant/10 last:border-b-0"
                          >
                            <button
                              type="button"
                              onClick={() => setPaidAccountId(account.id)}
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

                    {isAdvance ? (
                      <p className="mt-2.5 text-[11px] font-light text-amber-800/75">
                        Adelanto de dinero
                        {selectedPaidAccount
                          ? ` · pagas con ${selectedPaidAccount.name}`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="py-4 text-center text-[12px] font-light text-on-surface-variant">
                    No hay cuentas de liquidez. Créalas en Cuentas.
                  </p>
                )}

                {error && currentStep === 3 ? (
                  <p className="text-[11px] font-light text-balance-negative">
                    {error}
                  </p>
                ) : null}

                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={payableAccounts.length > 0 && !paidAccountId}
                  className="fab-ink flex h-11 w-full rounded-2xl text-sm font-semibold shadow-none disabled:opacity-40"
                >
                  Guardar gasto
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
