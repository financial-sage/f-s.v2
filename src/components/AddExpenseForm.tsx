"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bolt,
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
  Users,
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

interface AddExpenseFormProps {
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
      ? "border border-sage/20 bg-sage/20 text-[#3F593E] shadow-sm opacity-100"
      : "border border-outline-variant/20 bg-surface-lowest/70 text-outline-variant opacity-60";
  }

  return isSelected
    ? "border border-sage/20 bg-sage/20 text-[#3F593E] shadow-sm"
    : "border border-outline-variant/20 shadow-sm bg-surface-lowest/50 text-on-surface-variant hover:bg-surface-container-lowest";
}

function formatDisplayDate(value: string) {
  if (!value) {
    return "Selecciona una fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
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

  useEffect(() => setMounted(true), []);

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

  return (
    <form onSubmit={handleSubmit} className="flex min-h-dvh flex-col bg-transparent text-on-surface">
      {/* <header className="sticky top-0 z-50 w-full bg-transparent">
        <div className="flex w-full items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#4A6549] transition-colors hover:bg-surface-low"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-semibold tracking-tight text-on-surface">Añadir Gasto</h1>
          </div>
          <div className="w-10" />
        </div>
      </header> */}

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-3 bg-transparent">
        <section className="px-1 pt-2">
          <h1 className="text-lg font-bold text-on-surface">
            {expenseToEdit ? "Editar Gasto" : "Nuevo Gasto"}
          </h1>
          <p className="text-sm text-on-surface-variant">
            {expenseToEdit ? "Actualiza el movimiento seleccionado." : "Registra un nuevo movimiento."}
          </p>
        </section>

        <section className="mt-2 flex flex-col items-center gap-4 rounded-3xl bg-surface-lowest p-4 shadow-sm">
          <div className="text-center">
            <span className="text-xs uppercase tracking-wider text-on-surface-variant">
              Importe del gasto
            </span>
            <div className="mt-2 flex items-center justify-center">
              <span className="text-sage text-4xl font-extrabold">$</span>
              <button
                type="button"
                onClick={() => setShowKeypad(true)}
                className="w-full border-none bg-transparent text-center text-5xl font-extrabold text-on-surface outline-none"
              >
                {Number.isNaN(parseDecimal(amount)) || parseDecimal(amount) <= 0 ? (
                  <span className="text-outline-variant">0.00</span>
                ) : (
                  parseDecimal(amount).toFixed(2)
                )}
              </button>
            </div>
          </div>

          <div className="flex w-full items-center gap-3 border-t border-outline-variant/20 pt-4">
            <PencilLine size={16} className="text-outline-variant" />
            <input
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="¿En qué gastaste?"
              className="focus:outline-none w-full border-none bg-transparent text-sm font-medium text-on-surface placeholder:text-outline-variant focus:ring-0"
            />
          </div>
        </section>

        {!isSolo && (
          <>
            <section className="px-1 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-outline-variant mb-2 block">
                PAGADO POR
              </span>
              <div className="flex flex-wrap gap-2">
                {paidByOptions.map(({ value, label, icon: Icon }) => {
                  const isSelected = paidBy === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPaidBy(value)}
                      className={`flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium transition-all ${getSelectorClasses(
                        isSelected,
                        false
                      )}`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  );
                })}
              </div>

              {paidBy === "both_split" && (
                <div className="mt-3 flex gap-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant">Tú pusiste</label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                      <input
                        type="number"
                        value={myContribution}
                        onChange={(e) => setMyContribution(e.target.value.replace(/,/g, "."))}
                        className="w-full rounded-xl text-on-surface bg-surface-container py-2 pl-7 pr-3 outline-none border border-outline-variant/40"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-on-surface-variant">{resolvedPartnerFirstName} puso</label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">$</span>
                      <input
                        type="number"
                        value={partnerContribution}
                        onChange={(e) => setPartnerContribution(e.target.value.replace(/,/g, "."))}
                        className="w-full rounded-xl text-on-surface bg-surface-container py-2 pl-7 pr-3 outline-none border border-outline-variant/40"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="px-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-outline-variant mb-2 block">
                DESTINO DEL GASTO
              </span>
              <div className="flex flex-wrap gap-2">
                {responsibleOptions.map(({ value, label, icon: Icon }) => {
                  const isSelected = responsibleFor === value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setResponsibleFor(value)}
                      className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${getSelectorClasses(
                        isSelected,
                        false
                      )}`}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <div className="mt-4 flex flex-col rounded-2xl bg-surface-lowest shadow-sm">
          <button
            type="button"
            onClick={openCategorySheet}
            className="bg-transparent p-4 flex items-center justify-between text-left"
          >
            <span className="text-sm font-semibold text-on-surface">Categoria</span>
            <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
              <SelectedCategoryIcon size={18} className="text-primary" />
              {selectedCategoryItem.label}
            </span>
          </button>

          <div className="h-px w-full bg-surface-low" />

          <label
            htmlFor="expense-date"
            className="bg-transparent p-4 flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="text-sage flex h-9 w-9 items-center justify-center rounded-full bg-surface-low">
                <CalendarDays size={18} />
              </div>
              <span className="text-sm font-semibold capitalize text-on-surface">{displayDate}</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant transition-colors hover:text-[#4A6549]">
              Cambiar
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
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 bg-transparent p-4 backdrop-blur-md">
        <button
          type="submit"
          disabled={isSaving}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sage font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <CheckCircle2 size={18} />
          )}
          {isSaving ? (expenseToEdit ? "Actualizando..." : "Guardando...") : (expenseToEdit ? "Actualizar" : "Guardar")}
        </button>
      </footer>

      {isCategorySheetOpen && mounted && (
        <div className="fixed inset-0 z-90 flex flex-col justify-end">
          <div
            className={`absolute inset-0 bg-on-surface/95/60 backdrop-blur-sm transition-opacity duration-300 ${isSheetAnimated ? "opacity-100" : "opacity-0"}`}
            onClick={closeCategorySheet}
          />
          <div className={`relative bg-surface-lowest rounded-t-[2.5rem] p-6 pb-10 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSheetAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
            <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-on-surface/10" />
            <span className="mb-4 block text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
              CATEGORIA
            </span>
            <div className="mt-4 flex flex-col gap-6">
              {/* Top categories */}
              <div className="grid grid-cols-5 gap-y-6 gap-x-2">
                {topCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      closeCategorySheet();
                    }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                        selectedCategory === cat.id
                          ? "bg-primary/20 text-primary border-transparent"
                          : "bg-surface-lowest border border-outline-variant/40 text-on-surface-variant"
                      }`}
                    >
                      <cat.icon size={20} strokeWidth={1.5} />
                    </div>
                    <span
                      className={`text-[9px] font-medium tracking-wide truncate w-full text-center ${
                        selectedCategory === cat.id ? "text-primary font-bold" : "text-on-surface-variant"
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Extra categories — smooth height + opacity transition */}
              <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}>
                <div className="overflow-hidden">
                  <div className={`grid grid-cols-5 gap-y-6 gap-x-2 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isExpanded ? "translate-y-0 scale-100" : "-translate-y-2 scale-[0.98]"
                  }`}>
                    {extraCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          closeCategorySheet();
                        }}
                        className="flex flex-col items-center gap-2"
                      >
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                            selectedCategory === cat.id
                              ? "bg-primary/20 text-primary border-transparent"
                              : "bg-surface-lowest border border-outline-variant/40 text-on-surface-variant"
                          }`}
                        >
                          <cat.icon size={20} strokeWidth={1.5} />
                        </div>
                        <span
                          className={`text-[9px] font-medium tracking-wide truncate w-full text-center ${
                            selectedCategory === cat.id ? "text-primary font-bold" : "text-on-surface-variant"
                          }`}
                        >
                          {cat.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* "Otros" toggle — always at the bottom */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    isExpanded
                      ? "bg-on-surface/95 text-white shadow-md rotate-90 scale-105"
                      : "bg-surface-low text-on-surface-variant hover:bg-surface-container"
                  }`}>
                    {isExpanded ? <X size={20} strokeWidth={2} /> : <MoreHorizontal size={20} strokeWidth={1.5} />}
                  </div>
                  <span className={`text-[9px] font-medium transition-colors duration-300 ${isExpanded ? "text-on-surface font-bold" : "text-on-surface-variant"}`}>
                    {isExpanded ? "Cerrar" : "Otros"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <NumericKeypadSheet
        isOpen={showKeypad}
        title="IMPORTE DEL GASTO"
        initialValue={amount || "0"}
        onClose={() => setShowKeypad(false)}
        onValueChange={(value) => setAmount(sanitizeDecimalInput(value))}
        onConfirm={() => setShowKeypad(false)}
      />
    </form>
  );
}
