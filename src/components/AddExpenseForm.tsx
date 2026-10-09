"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  CheckCircle2,
  Heart,
  Home,
  LoaderCircle,
  MoreHorizontal,
  PencilLine,
  User,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  saveExpenseAction,
  type ExpenseActor,
  type ExpenseCategory,
  type ExpenseResponsibleFor,
} from "@/app/actions/expenses";
import { editExpenseAction } from "@/app/actions/editExpense";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import type { ExpenseToEdit } from "@/components/ExpenseModalProvider";
import { topCategories, extraCategories, type CategoryTile } from "@/lib/categoryMap";
import { createClient } from "@/utils/supabase/client";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useCategories } from "@/hooks/useCategories";
import { listFamilyFundsAction } from "@/app/actions/funds";
import type { FamilyFund } from "@/lib/funds";
import { getDefaultSharedFund, resolveFundColor } from "@/lib/funds";

interface AddExpenseFormProps {
  familyId: string;
  familyMemberCount?: number;
  partnerFirstName?: string;
  onClose?: () => void;
  expenseToEdit?: ExpenseToEdit | null;
  financialModel?: string;
  user1SplitPct?: number;
}

interface OptionItem<T extends string> {
  value: T;
  label: string;
  icon: LucideIcon;
}

type ExpenseOrigin = ExpenseActor | "both_split";
type FinancialModel = "joint_fund" | "p2p_50_50" | "p2p_proportional";

function getFirstName(value?: string | null, fallback = "Mi pareja") {
  const firstName = value?.trim().split(/\s+/)[0];
  return firstName || fallback;
}

function normalizeFinancialModel(value?: string | null): FinancialModel {
  if (value === "p2p_50_50" || value === "p2p_proportional") {
    return value;
  }

  return "joint_fund";
}

function buildPaidByOptions(
  partnerLabel: string,
  financialModel: FinancialModel
): OptionItem<ExpenseOrigin>[] {
  const baseOptions: OptionItem<ExpenseOrigin>[] = [
    { value: "me", label: "Mi", icon: Wallet },
    { value: "partner", label: partnerLabel, icon: Heart },
  ];

  if (financialModel === "joint_fund") {
    baseOptions.push({ value: "joint_fund", label: "Fondo Común", icon: Home });
  }

  return baseOptions;
}

function buildResponsibleOptions(
  partnerLabel: string,
  financialModel: FinancialModel
): OptionItem<ExpenseResponsibleFor>[] {
  const sharedLabel =
    financialModel === "joint_fund"
      ? "Fondo Común"
      : financialModel === "p2p_50_50"
        ? "A medias (50/50)"
        : "Proporcional";

  return [
    { value: "joint_fund", label: sharedLabel, icon: Home },
    { value: "me", label: "Mío", icon: User },
    { value: "partner", label: partnerLabel, icon: Heart },
  ];
}



function getSelectorClasses(isSelected: boolean, disabled: boolean) {
  if (disabled) {
    return isSelected
      ? "border border-primary/25 bg-primary/15 text-primary shadow-sm opacity-100"
      : "border border-outline-variant/20 bg-white/40 text-outline-variant opacity-60";
  }

  return isSelected
    ? "border border-primary/25 bg-primary/15 text-primary shadow-sm"
    : "border border-outline-variant/20 bg-white/55 text-on-surface-variant shadow-sm hover:bg-white/80";
}

function formatDisplayDate(value: string) {
  if (!value) {
    return "Fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}

function getCategoryIdFromValue(category?: string | null) {
  const found = [...topCategories, ...extraCategories].find((option) => option.id === category);
  return found?.id ?? "super";
}

function sanitizeDecimalInput(value: string | number) {
  const normalized = String(value ?? "")
    .replace(/,/g, ".")
    .replace(/[^\d.]/g, "");

  const [integerPart = "", ...decimalParts] = normalized.split(".");
  const decimalPart = decimalParts.join("").slice(0, 2);

  return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
}

export default function AddExpenseForm({
  familyId,
  familyMemberCount,
  partnerFirstName,
  onClose,
  expenseToEdit = null,
  financialModel = "joint_fund",
  user1SplitPct = 50,
}: AddExpenseFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [resolvedCurrentUserId, setResolvedCurrentUserId] = useState<string | null>(null);
  const [resolvedFamilyMemberCount, setResolvedFamilyMemberCount] = useState<number>(familyMemberCount ?? 1);
  const [resolvedPartnerFirstName, setResolvedPartnerFirstName] = useState<string>(
    getFirstName(partnerFirstName)
  );
  const [resolvedPartnerUserId, setResolvedPartnerUserId] = useState<string | null>(null);
  const resolvedFinancialModel = normalizeFinancialModel(financialModel);
  const isSolo = resolvedFamilyMemberCount <= 1;
  const isCoupleMode = !isSolo;

  const [amount, setAmount] = useState("0");
  const [concept, setConcept] = useState("");
  const [paidBy, setPaidBy] = useState<ExpenseOrigin>(isCoupleMode ? "me" : "me");
  const [responsibleFor, setResponsibleFor] = useState<ExpenseResponsibleFor>(
    isCoupleMode ? "joint_fund" : "me"
  );
  const [myContribution, setMyContribution] = useState("");
  const [partnerContribution, setPartnerContribution] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("food");
  const [isExpanded, setIsExpanded] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSaving, setIsSaving] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isSheetAnimated, setIsSheetAnimated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sharedFunds, setSharedFunds] = useState<FamilyFund[]>([]);
  const [selectedFundId, setSelectedFundId] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const funds = await listFamilyFundsAction();
        if (cancelled) return;
        const shared = funds.filter((f) => f.scope === "shared" && !f.archived_at);
        setSharedFunds(shared);
        const defaultShared = getDefaultSharedFund(shared) ?? shared[0] ?? null;
        setSelectedFundId((prev) => prev ?? defaultShared?.id ?? null);
      } catch {
        // Migration may not be applied; form still works with legacy joint_fund.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function resolveFamilyContext() {
      if (typeof familyMemberCount === "number") {
        setResolvedFamilyMemberCount(familyMemberCount);
      }

      if (partnerFirstName?.trim()) {
        setResolvedPartnerFirstName(getFirstName(partnerFirstName));
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (typeof familyMemberCount === "number" && partnerFirstName?.trim()) {
        if (!isCancelled) {
          setResolvedPartnerUserId(null);
        }
      }

      if (isCancelled || !user) {
        setResolvedCurrentUserId(null);
        if (typeof familyMemberCount !== "number") {
          setResolvedFamilyMemberCount(1);
        }
        if (!partnerFirstName?.trim()) {
          setResolvedPartnerFirstName("Mi pareja");
        }
        return;
      }

      setResolvedCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("family_id")
        .eq("id", user.id)
        .maybeSingle();

      if (isCancelled || !profile?.family_id) {
        if (typeof familyMemberCount !== "number") {
          setResolvedFamilyMemberCount(1);
        }
        if (!partnerFirstName?.trim()) {
          setResolvedPartnerFirstName("Mi pareja");
        }
        return;
      }

      if (typeof familyMemberCount !== "number") {
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("family_id", profile.family_id);

        if (!isCancelled) {
          setResolvedFamilyMemberCount(count && count > 1 ? count : 1);
        }
      }

      if (partnerFirstName?.trim()) {
        return;
      }

      const { data: family } = await supabase
        .from("families")
        .select("user_1_id, user_2_id")
        .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
        .maybeSingle();

      if (isCancelled) {
        return;
      }

      const resolvedPartnerId =
        family?.user_1_id === user.id ? family.user_2_id : family?.user_1_id ?? null;

      if (!resolvedPartnerId) {
        setResolvedPartnerUserId(null);
        setResolvedPartnerFirstName("Mi pareja");
        return;
      }

      setResolvedPartnerUserId(resolvedPartnerId);

      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", resolvedPartnerId)
        .maybeSingle();

      if (!isCancelled) {
        setResolvedPartnerFirstName(getFirstName(partnerProfile?.full_name));
      }
    }

    void resolveFamilyContext();

    return () => {
      isCancelled = true;
    };
  }, [familyMemberCount, partnerFirstName, supabase]);

  useEffect(() => {
    if (expenseToEdit && resolvedCurrentUserId) {
      const hydratedAmount = expenseToEdit.amount?.toString() ?? "0";
      const hydratedDate = (expenseToEdit as ExpenseToEdit & { expense_date?: string | null })
        .expense_date;

      setAmount(sanitizeDecimalInput(hydratedAmount));
      setConcept(expenseToEdit.concept ?? "");
      setSelectedCategory(getCategoryIdFromValue(expenseToEdit.category));
      setPaidBy(expenseToEdit.paid_by === resolvedCurrentUserId ? "me" : "partner");

      if (expenseToEdit.responsible_for === "joint_fund") {
        setResponsibleFor("joint_fund");
      } else if (expenseToEdit.responsible_for === resolvedCurrentUserId) {
        setResponsibleFor("me");
      } else {
        setResponsibleFor("partner");
      }

      if (hydratedDate) {
        setDate(hydratedDate.slice(0, 10));
      }

      setMyContribution("");
      setPartnerContribution("");
      setErrorMessage("");
      return;
    }

    if (expenseToEdit) {
      return;
    }

    setAmount("0");
    setConcept("");
    setPaidBy("me");
    setResponsibleFor(isCoupleMode ? "joint_fund" : "me");
    setMyContribution("");
    setPartnerContribution("");
    setSelectedCategory("food");
    setDate(new Date().toISOString().slice(0, 10));
    setErrorMessage("");
  }, [expenseToEdit, isCoupleMode, resolvedCurrentUserId]);

  useEffect(() => {
    if (
      isCoupleMode &&
      resolvedFinancialModel !== "joint_fund" &&
      (paidBy === "joint_fund" || paidBy === "both_split")
    ) {
      setPaidBy("me");
    }
  }, [isCoupleMode, paidBy, resolvedFinancialModel]);

  function openCategorySheet() {
    setIsExpanded(false);
    setIsCategorySheetOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setIsSheetAnimated(true)));
  }

  function closeCategorySheet() {
    setIsSheetAnimated(false);
    setTimeout(() => {
      setIsCategorySheetOpen(false);
      setIsExpanded(false);
    }, 450);
  }

  const displayDate = useMemo(() => formatDisplayDate(date), [date]);
  const paidByOptions = useMemo(
    () => buildPaidByOptions(resolvedPartnerFirstName, resolvedFinancialModel),
    [resolvedPartnerFirstName, resolvedFinancialModel]
  );
  const responsibleOptions = useMemo(
    () => buildResponsibleOptions(resolvedPartnerFirstName, resolvedFinancialModel),
    [resolvedPartnerFirstName, resolvedFinancialModel]
  );
  const allCategories = [...topCategories, ...extraCategories];
  const { activeCategories, getDisplayForCategory } = useCategories(familyId);
  const selectedCategoryItem =
    allCategories.find((option) => option.id === selectedCategory) ?? topCategories[0];
  const selectedCategoryValue = selectedCategoryItem.value;
  const SelectedCategoryIcon = selectedCategoryItem.icon;

  function parseDecimal(value: string | number) {
    const safeValue = sanitizeDecimalInput(value);
    return safeValue ? Number.parseFloat(safeValue) : Number.NaN;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");

    const finalAmount = parseFloat(amount.toString().replace(/,/g, "."));

    if (isNaN(finalAmount) || finalAmount <= 0) {
      const message = "El importe debe ser mayor a 0";
      setErrorMessage(message);
      window.alert(message);
      return;
    }

    if (!concept.trim()) {
      setErrorMessage("Escribe en qué gastaste.");
      return;
    }

    try {
      setIsSaving(true);

      if (expenseToEdit) {
        const resolvedPaidByValue =
          paidBy === "partner"
            ? resolvedPartnerUserId ?? expenseToEdit.paid_by ?? ""
            : paidBy === "me"
              ? resolvedCurrentUserId ?? expenseToEdit.paid_by ?? ""
              : expenseToEdit.paid_by ?? resolvedCurrentUserId ?? "";

        const resolvedResponsibleForValue =
          responsibleFor === "joint_fund"
            ? "joint_fund"
            : responsibleFor === "partner"
              ? resolvedPartnerUserId ?? expenseToEdit.responsible_for ?? ""
              : resolvedCurrentUserId ?? expenseToEdit.responsible_for ?? "";

        const formData = new FormData();
        formData.set("id", expenseToEdit.id);
        formData.set("amount", finalAmount.toString());
        formData.set("concept", concept.trim());
        formData.set("category", selectedCategory);
        formData.set("expense_date", date);
        formData.set("paid_by", resolvedPaidByValue);
        formData.set("responsible_for", resolvedResponsibleForValue);

        const result = await editExpenseAction(formData);

        if (result?.error) {
          throw new Error(result.error);
        }
      } else {
        if (isCoupleMode && paidBy === "both_split") {
          const mine = parseDecimal(myContribution);
          const partner = parseDecimal(partnerContribution);

          if (!Number.isFinite(mine) || mine < 0 || !Number.isFinite(partner) || partner < 0) {
            throw new Error("Ingresa cuánto puso cada persona.");
          }

          if (Math.round((mine + partner) * 100) !== Math.round(finalAmount * 100)) {
            throw new Error("La suma de ambos aportes debe coincidir con el monto total.");
          }

          const requests = [];

          if (mine > 0) {
            requests.push(
              saveExpenseAction({
                amount: mine,
                concept,
                paidBy: "me",
                responsibleFor,
                payerSharePct: 100,
                category: selectedCategory,
                date,
                fundId: responsibleFor === "joint_fund" ? selectedFundId : null,
                paidFromFund: false,
                splitTypeOverride:
                  responsibleFor === "joint_fund"
                    ? "fund_transfer"
                    : responsibleFor === "partner"
                      ? "p2p_debt"
                      : "personal",
              })
            );
          }

          if (partner > 0) {
            requests.push(
              saveExpenseAction({
                amount: partner,
                concept,
                paidBy: "partner",
                responsibleFor,
                payerSharePct: 100,
                category: selectedCategory,
                date,
                fundId: responsibleFor === "joint_fund" ? selectedFundId : null,
                paidFromFund: false,
                splitTypeOverride:
                  responsibleFor === "joint_fund"
                    ? "fund_transfer"
                    : responsibleFor === "me"
                      ? "p2p_debt"
                      : "personal",
              })
            );
          }

          await Promise.all(requests);
        } else {
          const singlePaidBy = (isCoupleMode ? paidBy : "me") as ExpenseActor;
          const splitTypeOverride =
            responsibleFor === "joint_fund"
              ? "fund_transfer"
              : responsibleFor === "partner" && singlePaidBy === "me"
                ? "p2p_debt"
                : responsibleFor === "me" && singlePaidBy === "partner"
                  ? "p2p_debt"
                  : "personal";

          await saveExpenseAction({
            amount: finalAmount,
            concept,
            paidBy: singlePaidBy,
            responsibleFor: isCoupleMode ? responsibleFor : "me",
            payerSharePct: 100,
            category: selectedCategory,
            date,
            splitTypeOverride,
            fundId:
              (isCoupleMode ? responsibleFor : "me") === "joint_fund"
                ? selectedFundId
                : null,
            paidFromFund: singlePaidBy === "joint_fund",
          });
        }
      }

      setShowKeypad(false);
      setIsSheetAnimated(false);
      setIsCategorySheetOpen(false);

      // Refresh store in background (Optimistic UI — no full page reload)
      const { refreshData } = useExpenseStore.getState();

      if (onClose) {
        onClose();
        window.setTimeout(() => {
          refreshData();
        }, 460);
      } else {
        router.push("/");
        refreshData();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo guardar el gasto."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const selectedFund =
    sharedFunds.find((fund) => fund.id === selectedFundId) ??
    getDefaultSharedFund(sharedFunds) ??
    sharedFunds[0] ??
    null;
  const amountAccent =
    !isSolo && responsibleFor === "joint_fund"
      ? resolveFundColor(selectedFund)
      : "#4A6549";

  return (
    <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col text-on-surface">
      <main className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
        <section className="px-0.5">
          <h1 className="text-base font-medium tracking-tight text-on-surface">
            {expenseToEdit ? "Editar gasto" : "Nuevo gasto"}
          </h1>
          <p className="text-xs text-on-surface-variant">
            {expenseToEdit ? "Actualiza el movimiento." : "Registra un nuevo movimiento."}
          </p>
        </section>

        <section
          className="flex flex-col items-center gap-2.5 rounded-[1.35rem] border border-white/60 p-3.5 shadow-[0_10px_28px_rgba(43,52,55,0.08)] backdrop-blur-md"
          style={{
            backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.78) 0%, ${amountAccent}14 55%, ${amountAccent}22 100%)`,
          }}
        >
          <div className="flex w-full flex-col items-center text-center">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-on-surface-variant">
              Importe
            </span>
            <button
              type="button"
              onClick={() => setShowKeypad(true)}
              className="mt-1 flex items-baseline justify-center gap-1 border-none bg-transparent outline-none"
            >
              <span className="text-2xl font-light" style={{ color: amountAccent }}>
                $
              </span>
              <span className="text-[2.55rem] font-light leading-none tracking-tight text-on-surface">
                {Number.isNaN(parseDecimal(amount)) || parseDecimal(amount) <= 0 ? (
                  <span className="text-outline-variant">0,00</span>
                ) : (
                  parseDecimal(amount).toFixed(2)
                )}
              </span>
            </button>
          </div>

          <div className="flex w-full items-center gap-2 border-t border-white/50 pt-2.5">
            <PencilLine size={15} className="shrink-0 text-outline-variant" />
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="¿En qué gastaste?"
              className="w-full border-none bg-transparent text-sm font-medium text-on-surface outline-none placeholder:text-outline-variant focus:ring-0"
            />
          </div>
        </section>

        {!isSolo && (
          <>
            <section className="px-0.5">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-outline-variant">
                Pagado por
              </span>
              <div className="flex flex-wrap gap-1.5">
                {paidByOptions.map(({ value, label, icon: Icon }) => {
                  const isSelected = paidBy === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaidBy(value)}
                      className={`flex items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${getSelectorClasses(
                        isSelected,
                        false
                      )}`}
                    >
                      <Icon size={13} />
                      {label}
                    </button>
                  );
                })}
              </div>

              {paidBy === "both_split" && (
                <div className="mt-2 flex gap-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-medium uppercase text-on-surface-variant">Tú</label>
                    <div className="relative mt-0.5">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">$</span>
                      <input
                        type="number"
                        value={myContribution}
                        onChange={(e) => setMyContribution(e.target.value.replace(/,/g, "."))}
                        className="w-full rounded-xl border border-outline-variant/30 bg-white/70 py-1.5 pl-6 pr-2 text-sm text-on-surface outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-medium uppercase text-on-surface-variant">{resolvedPartnerFirstName}</label>
                    <div className="relative mt-0.5">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">$</span>
                      <input
                        type="number"
                        value={partnerContribution}
                        onChange={(e) => setPartnerContribution(e.target.value.replace(/,/g, "."))}
                        className="w-full rounded-xl border border-outline-variant/30 bg-white/70 py-1.5 pl-6 pr-2 text-sm text-on-surface outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="px-0.5">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-outline-variant">
                Destino
              </span>
              <div className="flex flex-wrap gap-1.5">
                {responsibleOptions.map(({ value, label, icon: Icon }) => {
                  const isSelected = responsibleFor === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setResponsibleFor(value)}
                      className={`flex items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${getSelectorClasses(
                        isSelected,
                        false
                      )}`}
                    >
                      <Icon size={13} />
                      {label}
                    </button>
                  );
                })}
              </div>

              {responsibleFor === "joint_fund" && sharedFunds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {sharedFunds.map((fund) => {
                    const isSelected = selectedFundId === fund.id;
                    const fundColor = resolveFundColor(fund);
                    return (
                      <button
                        key={fund.id}
                        type="button"
                        onClick={() => setSelectedFundId(fund.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-md transition-all ${
                          isSelected
                            ? "text-on-surface"
                            : "border-white/60 bg-white/55 text-on-surface-variant hover:bg-white/80"
                        }`}
                        style={
                          isSelected
                            ? {
                                backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.88) 0%, ${fundColor}28 100%)`,
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
                  })}
                </div>
              )}
            </section>
          </>
        )}

        <div className="flex overflow-hidden rounded-2xl border border-white/60 bg-white/55 shadow-[0_8px_20px_rgba(43,52,55,0.06)] backdrop-blur-md">
          <button
            type="button"
            onClick={openCategorySheet}
            className="flex flex-1 items-center justify-between gap-2 px-3 py-2.5 text-left"
          >
            <span className="text-[11px] font-medium uppercase tracking-wide text-outline-variant">
              Categoría
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-on-surface">
              <SelectedCategoryIcon size={15} style={{ color: amountAccent }} />
              <span className="truncate">{selectedCategoryItem.label}</span>
            </span>
          </button>

          <div className="w-px self-stretch bg-outline-variant/20" />

          <label
            htmlFor="expense-date"
            className="flex flex-1 cursor-pointer items-center justify-between gap-2 px-3 py-2.5"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <CalendarDays size={14} className="shrink-0 text-outline-variant" />
              <span className="truncate text-sm font-medium capitalize text-on-surface">
                {displayDate}
              </span>
            </span>
          </label>
          <input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="sr-only"
          />
        </div>

        {errorMessage && (
          <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {errorMessage}
          </div>
        )}
      </main>

      <footer className="mt-3 shrink-0">
        <button
          type="submit"
          disabled={isSaving}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-[#f3f5f0] shadow-[0_10px_22px_rgba(43,52,55,0.28)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(145deg, #4a5558 0%, #2b3437 52%, #1a2224 100%)",
          }}
        >
          {isSaving ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <CheckCircle2 size={17} />
          )}
          {isSaving
            ? expenseToEdit
              ? "Actualizando..."
              : "Guardando..."
            : expenseToEdit
              ? "Actualizar"
              : "Guardar"}
        </button>
      </footer>

      {mounted &&
        isCategorySheetOpen &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex flex-col justify-end">
            <button
              type="button"
              aria-label="Cerrar categorías"
              className={`absolute inset-0 bg-on-surface/50 backdrop-blur-sm transition-opacity duration-300 ${
                isSheetAnimated ? "opacity-100" : "opacity-0"
              }`}
              onClick={closeCategorySheet}
            />
            <div
              className={`relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-linear-to-b from-[#f7f8f5] to-[#eef1eb] shadow-[0_-16px_48px_rgba(43,52,55,0.18)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isSheetAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
              }`}
            >
              <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-outline-variant/40" />

              <div className="relative flex shrink-0 items-center justify-center px-5 pb-2 pt-3">
                <p className="text-base font-medium tracking-tight text-on-surface">Categoría</p>
                <button
                  type="button"
                  onClick={closeCategorySheet}
                  className="absolute right-4 top-2 flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/25 bg-white/70 text-on-surface-variant shadow-sm backdrop-blur-sm"
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-5 gap-x-2 gap-y-3">
                    {activeCategories.slice(0, 10).map((cat) => {
                      const display = getDisplayForCategory(cat.id);
                      const Icon = display.icon;
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            closeCategorySheet();
                          }}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm backdrop-blur-md transition-all ${
                              isSelected
                                ? "border-transparent text-white shadow-md"
                                : "border-white/60 bg-white/70 text-on-surface-variant"
                            }`}
                            style={isSelected ? { backgroundColor: amountAccent } : undefined}
                          >
                            <Icon size={18} strokeWidth={1.6} />
                          </div>
                          <span
                            className={`w-full truncate text-center text-[10px] font-medium tracking-wide ${
                              isSelected ? "font-semibold text-on-surface" : "text-on-surface-variant"
                            }`}
                          >
                            {display.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div
                        className={`grid grid-cols-5 gap-x-2 gap-y-3 pt-1 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          isExpanded ? "translate-y-0 scale-100" : "-translate-y-2 scale-[0.98]"
                        }`}
                      >
                        {activeCategories.slice(10).map((cat) => {
                          const display = getDisplayForCategory(cat.id);
                          const Icon = display.icon;
                          const isSelected = selectedCategory === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setSelectedCategory(cat.id);
                                closeCategorySheet();
                              }}
                              className="flex flex-col items-center gap-1.5"
                            >
                              <div
                                className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm backdrop-blur-md transition-all ${
                                  isSelected
                                    ? "border-transparent text-white shadow-md"
                                    : "border-white/60 bg-white/70 text-on-surface-variant"
                                }`}
                                style={isSelected ? { backgroundColor: amountAccent } : undefined}
                              >
                                <Icon size={18} strokeWidth={1.6} />
                              </div>
                              <span
                                className={`w-full truncate text-center text-[10px] font-medium tracking-wide ${
                                  isSelected ? "font-semibold text-on-surface" : "text-on-surface-variant"
                                }`}
                              >
                                {display.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {activeCategories.length > 10 && (
                    <div className="flex justify-center pt-1">
                      <button
                        type="button"
                        onClick={() => setIsExpanded((open) => !open)}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            isExpanded
                              ? "rotate-90 scale-105 border-transparent bg-on-surface text-white shadow-md"
                              : "border-white/60 bg-white/70 text-on-surface-variant"
                          }`}
                        >
                          {isExpanded ? (
                            <X size={18} strokeWidth={2} />
                          ) : (
                            <MoreHorizontal size={18} strokeWidth={1.5} />
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-medium transition-colors duration-300 ${
                            isExpanded ? "font-semibold text-on-surface" : "text-on-surface-variant"
                          }`}
                        >
                          {isExpanded ? "Cerrar" : "Más"}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      <NumericKeypadSheet
        isOpen={showKeypad}
        title="Importe del gasto"
        subtitle={
          !isSolo && responsibleFor === "joint_fund"
            ? selectedFund?.name ?? "Bolsillo"
            : undefined
        }
        accentColor={amountAccent}
        initialValue={amount || "0"}
        onClose={() => setShowKeypad(false)}
        onValueChange={(value) => setAmount(sanitizeDecimalInput(value))}
        onConfirm={() => setShowKeypad(false)}
      />
    </form>
  );
}
