"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  CheckCircle2,
  Heart,
  Home,
  Landmark,
  LoaderCircle,
  MoreHorizontal,
  Camera,
  PencilLine,
  Scale,
  Sparkles,
  User,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  saveExpenseAction,
  type ExpenseActor,
  type ExpenseResponsibleFor,
} from "@/app/actions/expenses";
import { SoftDecimals } from "@/components/FormattedCurrency";
import { editExpenseAction } from "@/app/actions/editExpense";
import BothSplitBelongModal, {
  type BothSplitBelongChoice,
} from "@/components/BothSplitBelongModal";
import ConceptSuggestModal from "@/components/ConceptSuggestModal";
import ProductTour, { type ProductTourStep } from "@/components/ProductTour";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { useExpenseModal, type ExpenseToEdit } from "@/components/ExpenseModalProvider";
import { useProductTour } from "@/hooks/useProductTour";
import { frequentConceptsForFund } from "@/lib/expenses/frequent-concepts";
import { createClient } from "@/utils/supabase/client";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useFundsStore } from "@/store/useFundsStore";
import { useAccountsStore } from "@/store/useAccountsStore";
import { listFamilyCategoriesAction } from "@/app/actions/categories";
import {
  listParentCategories,
  listSubcategories,
  resolveCategoryIcon,
  type FamilyCategory,
} from "@/lib/familyCategories";
import {
  fundIconChipStyle,
  getDefaultSharedFund,
  getPersonalFund,
  listSoloDashboardFunds,
  listVariableSharedFunds,
  personalFundDisplayName,
  resolveFundColor,
  type FamilyFund,
} from "@/lib/funds";
import type { FamilyAccount } from "@/lib/accounts";
import {
  listPayableAccountsForUser,
  resolveAccountColor,
} from "@/lib/accounts";
import { tintedGlassGradient } from "@/lib/glass";
import { useCurrency } from "@/hooks/useCurrency";
import { useIsDark } from "@/hooks/useIsDark";

type PaymentSource = "fund" | "account";

interface AddExpenseFormProps {
  familyId: string;
  currentUserId?: string;
  partnerUserId?: string | null;
  familyMemberCount?: number;
  partnerFirstName?: string;
  onClose?: () => void;
  /** Lets the parent sheet lock dismiss while OCR runs. */
  onScanningChange?: (scanning: boolean) => void;
  /** When true, title lives in the Sheet header (aligned with close). */
  hideChromeTitle?: boolean;
  expenseToEdit?: ExpenseToEdit | null;
  financialModel?: string;
  user1SplitPct?: number;
}

function resolveInitialUserId(propUserId?: string) {
  return propUserId ?? useExpenseStore.getState().userId ?? null;
}

function resolveInitialPartnerId(propPartnerId?: string | null) {
  if (propPartnerId !== undefined) return propPartnerId;
  return useExpenseStore.getState().partnerId ?? null;
}

function resolveInitialMemberCount(propCount?: number, partnerId?: string | null) {
  if (typeof propCount === "number") return propCount;
  if (partnerId) return 2;
  const store = useExpenseStore.getState();
  if (store.partnerId) return 2;
  if (store.isHydrated) return 1;
  return 1;
}

function resolveInitialSharedFunds() {
  return listVariableSharedFunds(useFundsStore.getState().funds);
}

function resolveInitialPayableAccounts(userId: string | null) {
  if (!userId) return [];
  return listPayableAccountsForUser(useAccountsStore.getState().accounts, userId);
}

function pickDefaultFundId(
  funds: FamilyFund[],
  preferredFundId: string | null,
  previous: string | null,
  options?: { preferPersonalDefault?: boolean; userId?: string | null }
) {
  if (previous && funds.some((fund) => fund.id === previous)) return previous;
  if (preferredFundId && funds.some((fund) => fund.id === preferredFundId)) {
    return preferredFundId;
  }
  if (options?.preferPersonalDefault && options.userId) {
    return getPersonalFund(funds, options.userId)?.id ?? funds[0]?.id ?? null;
  }
  return getDefaultSharedFund(funds)?.id ?? funds[0]?.id ?? null;
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

function normalizeFinancialModel(_value?: string | null): FinancialModel {
  // Couples only use shared/personal pockets (modelo de reparto removed).
  return "joint_fund";
}

function buildPaidByOptions(
  partnerLabel: string,
  financialModel: FinancialModel
): OptionItem<ExpenseOrigin>[] {
  const baseOptions: OptionItem<ExpenseOrigin>[] = [
    { value: "me", label: "Mi", icon: Wallet },
    { value: "partner", label: partnerLabel, icon: Heart },
    { value: "both_split", label: "50/50", icon: Scale },
  ];

  if (financialModel === "joint_fund") {
    baseOptions.push({ value: "joint_fund", label: "Bolsillos", icon: Home });
  }

  return baseOptions;
}

function splitAmountFiftyFifty(total: number): { mine: string; partner: string } {
  const safe = Number.isFinite(total) && total > 0 ? total : 0;
  const mine = Math.round((safe / 2) * 100) / 100;
  const partner = Math.round((safe - mine) * 100) / 100;
  return {
    mine: mine > 0 ? String(mine) : "",
    partner: partner > 0 ? String(partner) : "",
  };
}

function buildResponsibleOptions(
  partnerLabel: string,
  _financialModel: FinancialModel
): OptionItem<ExpenseResponsibleFor>[] {
  return [
    { value: "joint_fund", label: "Bolsillos", icon: Home },
    { value: "me", label: "Mío", icon: User },
    { value: "partner", label: partnerLabel, icon: Heart },
  ];
}



function getSelectorClasses(isSelected: boolean, disabled: boolean) {
  if (disabled) {
    return isSelected
      ? "border border-primary/30 bg-primary/15 text-on-surface/80 shadow-sm opacity-100"
      : "border border-outline-variant/20 bg-surface-low text-on-surface/45 opacity-70";
  }

  return isSelected
    ? "border border-primary/35 bg-primary/15 text-on-surface shadow-sm"
    : "border border-outline-variant/25 bg-surface-low text-on-surface/65 shadow-sm hover:bg-surface-container hover:text-on-surface/80";
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
  currentUserId,
  partnerUserId,
  familyMemberCount,
  partnerFirstName,
  onClose,
  onScanningChange,
  hideChromeTitle = false,
  expenseToEdit = null,
  financialModel = "joint_fund",
  user1SplitPct = 50,
}: AddExpenseFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { meta: currencyMeta } = useCurrency();
  const isDark = useIsDark();
  const formatAmountDisplay = (value: number) =>
    new Intl.NumberFormat(currencyMeta.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
  const { preferredFundId } = useExpenseModal();

  const storeFunds = useFundsStore((s) => s.funds);
  const loadFunds = useFundsStore((s) => s.load);
  const storeAccounts = useAccountsStore((s) => s.accounts);
  const loadAccounts = useAccountsStore((s) => s.load);
  const storeUserId = useExpenseStore((s) => s.userId);
  const storePartnerId = useExpenseStore((s) => s.partnerId);
  const storePartnerName = useExpenseStore((s) => s.partnerName);
  const storeExpenses = useExpenseStore((s) => s.expenses);

  const [resolvedCurrentUserId, setResolvedCurrentUserId] = useState<string | null>(() =>
    resolveInitialUserId(currentUserId)
  );
  const [resolvedPartnerUserId, setResolvedPartnerUserId] = useState<string | null>(() =>
    resolveInitialPartnerId(partnerUserId)
  );
  const [resolvedFamilyMemberCount, setResolvedFamilyMemberCount] = useState<number>(() =>
    resolveInitialMemberCount(familyMemberCount, partnerUserId)
  );
  const [resolvedPartnerFirstName, setResolvedPartnerFirstName] = useState<string>(() =>
    getFirstName(partnerFirstName ?? useExpenseStore.getState().partnerName)
  );
  const resolvedFinancialModel = normalizeFinancialModel(financialModel);
  const isSolo = resolvedFamilyMemberCount <= 1;
  const isCoupleMode = !isSolo;

  const expenseTourSteps = useMemo<ProductTourStep[]>(
    () => [
      {
        target: "expense-amount",
        title: "Importe y escanear",
        body: "Toca el importe para escribirlo con el teclado, o usa Escanear para leer un ticket, foto o factura PDF.",
        placement: "bottom",
      },
      {
        target: "expense-concept",
        title: "¿En qué gastaste?",
        body: "Un concepto corto (café, súper…). Sirve para el historial y para sugerir categoría.",
        placement: "bottom",
      },
      {
        target: "expense-pay-from",
        title: "Pagar desde",
        body: "Elige si sale de un bolsillo o de una cuenta bancaria. Así el saldo queda donde corresponde.",
        placement: "bottom",
      },
      {
        target: "expense-category",
        title: "Categoría",
        body: "Clasifica el gasto (y subcategoría si tiene). El presupuesto mira la categoría padre.",
        placement: "top",
      },
    ],
    []
  );
  const expenseTour = useProductTour(
    resolvedCurrentUserId,
    "expenseForm",
    expenseTourSteps,
    {
      hasFamily: true,
      autoStart: !expenseToEdit,
      enabled: !expenseToEdit,
    }
  );

  const [amount, setAmount] = useState("0");
  const [concept, setConcept] = useState("");
  const [paidBy, setPaidBy] = useState<ExpenseOrigin>("me");
  const [responsibleFor, setResponsibleFor] = useState<ExpenseResponsibleFor>(() =>
    resolveInitialMemberCount(familyMemberCount, partnerUserId) > 1 ? "joint_fund" : "me"
  );
  const [myContribution, setMyContribution] = useState("");
  const [partnerContribution, setPartnerContribution] = useState("");
  /** Which 50/50 side is being edited on the app keypad. */
  const [splitEditSide, setSplitEditSide] = useState<"me" | "partner" | null>(
    null
  );
  const [splitBelongOpen, setSplitBelongOpen] = useState(false);
  const [splitBelongChoice, setSplitBelongChoice] =
    useState<BothSplitBelongChoice>("each_personal");
  const [splitBelongFundId, setSplitBelongFundId] = useState<string | null>(
    null
  );
  const [conceptSuggestOpen, setConceptSuggestOpen] = useState(false);
  const autoSubmitAfterConceptRef = useRef(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [familyCategories, setFamilyCategories] = useState<FamilyCategory[]>(
    []
  );
  /** Leaf category id (parent or subcategory). */
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [categoryReady, setCategoryReady] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSaving, setIsSaving] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isSheetAnimated, setIsSheetAnimated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [balanceWarning, setBalanceWarning] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanBusyPrompt, setScanBusyPrompt] = useState("");
  const [scanBusyTyping, setScanBusyTyping] = useState(false);
  const [scanHint, setScanHint] = useState("");
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const sharedFunds = useMemo(() => listVariableSharedFunds(storeFunds), [storeFunds]);
  const personalFunds = useMemo(() => {
    if (!resolvedCurrentUserId) return [] as FamilyFund[];
    return listSoloDashboardFunds(storeFunds, resolvedCurrentUserId);
  }, [storeFunds, resolvedCurrentUserId]);
  const selectableFunds = isSolo ? personalFunds : sharedFunds;
  const [selectedFundId, setSelectedFundId] = useState<string | null>(() => {
    const solo = resolveInitialMemberCount(familyMemberCount, partnerUserId) <= 1;
    const userId = resolveInitialUserId(currentUserId);
    const funds = solo
      ? userId
        ? listSoloDashboardFunds(useFundsStore.getState().funds, userId)
        : []
      : resolveInitialSharedFunds();
    return pickDefaultFundId(funds, preferredFundId, null, {
      preferPersonalDefault: solo,
      userId,
    });
  });
  const payableAccounts = useMemo(() => {
    if (!resolvedCurrentUserId) return [] as FamilyAccount[];
    return listPayableAccountsForUser(storeAccounts, resolvedCurrentUserId);
  }, [storeAccounts, resolvedCurrentUserId]);
  const [paymentSource, setPaymentSource] = useState<PaymentSource>("fund");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(() => {
    const payable = resolveInitialPayableAccounts(resolveInitialUserId(currentUserId));
    return payable[0]?.id ?? null;
  });

  const displayDate = useMemo(() => formatDisplayDate(date), [date]);
  const paidByOptions = useMemo(
    () => buildPaidByOptions(resolvedPartnerFirstName, resolvedFinancialModel),
    [resolvedPartnerFirstName, resolvedFinancialModel]
  );
  const responsibleOptions = useMemo(
    () => buildResponsibleOptions(resolvedPartnerFirstName, resolvedFinancialModel),
    [resolvedPartnerFirstName, resolvedFinancialModel]
  );

  useEffect(() => {
    onScanningChange?.(isScanning);
    return () => onScanningChange?.(false);
  }, [isScanning, onScanningChange]);

  useEffect(() => {
    if (!isScanning) {
      setScanBusyPrompt("");
      setScanBusyTyping(false);
      return;
    }

    const full =
      "Los servicios de lectura están con mucha demanda. Seguimos en ello; gracias por esperar.";
    let intervalId: number | undefined;
    const startTimer = window.setTimeout(() => {
      setScanBusyTyping(true);
      let i = 0;
      intervalId = window.setInterval(() => {
        i += 1;
        setScanBusyPrompt(full.slice(0, i));
        if (i >= full.length) {
          window.clearInterval(intervalId);
          setScanBusyTyping(false);
        }
      }, 26);
    }, 4000);

    return () => {
      window.clearTimeout(startTimer);
      if (intervalId !== undefined) window.clearInterval(intervalId);
      setScanBusyPrompt("");
      setScanBusyTyping(false);
    };
  }, [isScanning]);

  useEffect(() => setMounted(true), []);

  const appliedPreferredFundRef = useRef<string | null>(null);

  // Prefer dashboard pocket when available; keep the user's later choice.
  useEffect(() => {
    setSelectedFundId((prev) =>
      pickDefaultFundId(selectableFunds, preferredFundId, prev, {
        preferPersonalDefault: isSolo,
        userId: resolvedCurrentUserId,
      })
    );
  }, [selectableFunds, preferredFundId, isSolo, resolvedCurrentUserId]);

  useEffect(() => {
    if (expenseToEdit || !preferredFundId) return;
    if (appliedPreferredFundRef.current === preferredFundId) return;
    if (!selectableFunds.some((fund) => fund.id === preferredFundId)) return;
    appliedPreferredFundRef.current = preferredFundId;
    setSelectedFundId(preferredFundId);
    if (!isSolo) setResponsibleFor("joint_fund");
  }, [expenseToEdit, preferredFundId, selectableFunds, isSolo]);

  useEffect(() => {
    setSelectedAccountId((prev) => {
      if (prev && payableAccounts.some((a) => a.id === prev)) return prev;
      return payableAccounts[0]?.id ?? null;
    });
  }, [payableAccounts]);

  // Refresh caches in background only when stale (TTL inside stores).
  useEffect(() => {
    void loadFunds();
    void loadAccounts();
  }, [loadFunds, loadAccounts]);

  // Prefer props / expense store; network only as last resort for standalone page.
  useEffect(() => {
    if (typeof familyMemberCount === "number") {
      setResolvedFamilyMemberCount(familyMemberCount);
    }
    if (partnerFirstName?.trim()) {
      setResolvedPartnerFirstName(getFirstName(partnerFirstName));
    } else if (storePartnerName?.trim()) {
      setResolvedPartnerFirstName(getFirstName(storePartnerName));
    }

    const fromPropsOrStore =
      currentUserId ?? storeUserId ?? null;
    const partnerFromPropsOrStore =
      partnerUserId !== undefined ? partnerUserId : storePartnerId ?? null;

    if (fromPropsOrStore) {
      setResolvedCurrentUserId(fromPropsOrStore);
    }
    if (partnerFromPropsOrStore !== undefined) {
      setResolvedPartnerUserId(partnerFromPropsOrStore);
      if (typeof familyMemberCount !== "number") {
        setResolvedFamilyMemberCount(partnerFromPropsOrStore ? 2 : 1);
      }
    }

    const hasCompleteContext =
      Boolean(fromPropsOrStore) &&
      typeof familyMemberCount === "number" &&
      Boolean(partnerFirstName?.trim());

    if (hasCompleteContext) {
      return;
    }

    let isCancelled = false;

    async function resolveFamilyContext() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isCancelled || !user) {
        if (!fromPropsOrStore) setResolvedCurrentUserId(null);
        return;
      }

      if (!fromPropsOrStore) {
        setResolvedCurrentUserId(user.id);
      }

      if (typeof familyMemberCount === "number" && partnerFirstName?.trim() && partnerUserId !== undefined) {
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("family_id")
        .eq("id", user.id)
        .maybeSingle();

      if (isCancelled || !profile?.family_id) {
        return;
      }

      if (typeof familyMemberCount !== "number" && partnerFromPropsOrStore == null) {
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("family_id", profile.family_id);

        if (!isCancelled) {
          setResolvedFamilyMemberCount(count && count > 1 ? count : 1);
        }
      }

      if (partnerUserId !== undefined && partnerFirstName?.trim()) {
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
        if (partnerUserId === undefined) setResolvedPartnerUserId(null);
        if (typeof familyMemberCount !== "number") {
          setResolvedFamilyMemberCount(1);
        }
        setResolvedPartnerFirstName("");
        return;
      }

      if (partnerUserId === undefined) {
        setResolvedPartnerUserId(resolvedPartnerId);
      }
      if (typeof familyMemberCount !== "number") {
        setResolvedFamilyMemberCount(2);
      }

      if (partnerFirstName?.trim()) {
        return;
      }

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
  }, [
    currentUserId,
    familyMemberCount,
    partnerFirstName,
    partnerUserId,
    storePartnerId,
    storePartnerName,
    storeUserId,
    supabase,
  ]);

  useEffect(() => {
    let cancelled = false;
    void listFamilyCategoriesAction()
      .then((list) => {
        if (cancelled) return;
        setFamilyCategories(list);
        if (!expenseToEdit) {
          const parents = listParentCategories(
            list,
            resolvedCurrentUserId ?? ""
          );
          if (parents[0] && !selectedCategoryId) {
            setSelectedCategoryId(parents[0].id);
            setCategoryReady(true);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setFamilyCategories([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per open / user
  }, [resolvedCurrentUserId]);

  useEffect(() => {
    if (expenseToEdit && resolvedCurrentUserId) {
      const hydratedAmount = expenseToEdit.amount?.toString() ?? "0";
      const hydratedDate = (expenseToEdit as ExpenseToEdit & { expense_date?: string | null })
        .expense_date;

      setAmount(sanitizeDecimalInput(hydratedAmount));
      setConcept(expenseToEdit.concept ?? "");
      if (expenseToEdit.category_id) {
        setSelectedCategoryId(expenseToEdit.category_id);
        setCategoryReady(true);
      }
      setPaidBy(expenseToEdit.paid_by === resolvedCurrentUserId ? "me" : "partner");

      if (expenseToEdit.responsible_for === "joint_fund") {
        setResponsibleFor("joint_fund");
      } else if (expenseToEdit.responsible_for === resolvedCurrentUserId) {
        setResponsibleFor("me");
      } else {
        setResponsibleFor("partner");
      }

      if (expenseToEdit.fund_id) {
        setSelectedFundId(expenseToEdit.fund_id);
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
    if (preferredFundId) {
      setSelectedFundId(preferredFundId);
    }
    setMyContribution("");
    setPartnerContribution("");
    setSelectedCategoryId(null);
    setCategoryReady(false);
    setDate(new Date().toISOString().slice(0, 10));
    setErrorMessage("");
  }, [expenseToEdit, isCoupleMode, preferredFundId, resolvedCurrentUserId]);

  useEffect(() => {
    if (
      isCoupleMode &&
      resolvedFinancialModel !== "joint_fund" &&
      paidBy === "joint_fund"
    ) {
      setPaidBy("me");
    }
  }, [isCoupleMode, paidBy, resolvedFinancialModel]);

  // Keep 50/50 contributions in sync with the total amount.
  useEffect(() => {
    if (!isCoupleMode || paidBy !== "both_split") return;
    const total = parseDecimal(amount);
    const { mine, partner } = splitAmountFiftyFifty(total);
    setMyContribution(mine);
    setPartnerContribution(partner);
  }, [amount, isCoupleMode, paidBy]);

  async function handleReceiptFile(file: File | null) {
    if (!file) return;
    setIsScanning(true);
    setShowKeypad(false);
    setIsCategorySheetOpen(false);
    setConceptSuggestOpen(false);
    setScanHint("");
    setErrorMessage("");
    try {
      const { prepareReceiptFile } = await import(
        "@/lib/receipts/prepare-image"
      );
      const prepared = await prepareReceiptFile(file);

      const form = new FormData();
      form.set("file", prepared);
      form.set(
        "localeHint",
        currencyMeta.country === "CO"
          ? "español de Colombia"
          : currencyMeta.country === "ES"
            ? "español de España"
            : "español"
      );
      form.set(
        "funds",
        JSON.stringify(
          selectableFunds.map((f) => ({
            id: f.id,
            name: isSolo ? personalFundDisplayName(f) : f.name,
          }))
        )
      );
      const res = await fetch("/api/receipts/parse", {
        method: "POST",
        body: form,
      });
      const rawText = await res.text();
      let data: {
        ok?: boolean;
        error?: string;
        receipt?: {
          merchant?: string | null;
          description?: string | null;
          primaryProduct?: string | null;
          itemCount?: number | null;
          total?: number | null;
          date?: string | null;
          categoryId?: string | null;
          categoryHint?: string | null;
          fundId?: string | null;
          confidence?: string;
          rawNotes?: string | null;
        };
      } = {};
      try {
        data = rawText ? (JSON.parse(rawText) as typeof data) : {};
      } catch {
        if (res.status === 413 || /request entity too large/i.test(rawText)) {
          throw new Error(
            "La foto del ticket es demasiado grande para el servidor. Intenta de nuevo (la comprimimos al enviar)."
          );
        }
        throw new Error(
          res.ok
            ? "Respuesta inválida al leer el ticket."
            : `No se pudo leer el ticket (${res.status}).`
        );
      }
      if (!res.ok || !data.receipt) {
        throw new Error(data.error || "No se pudo leer el ticket.");
      }

      const receipt = data.receipt;
      if (typeof receipt.total === "number" && receipt.total > 0) {
        setAmount(sanitizeDecimalInput(String(receipt.total)));
      }

      // Concept: 1 product → product; many → establishment (server already prefers this).
      const conceptFromScan =
        receipt.description?.trim() ||
        (receipt.itemCount === 1 && receipt.primaryProduct
          ? receipt.primaryProduct
          : null) ||
        receipt.merchant?.trim() ||
        "";
      if (conceptFromScan) {
        setConcept(conceptFromScan.slice(0, 80));
      }
      if (receipt.date) setDate(receipt.date.slice(0, 10));

      // Prefer keeping the user's selected category; receipt may only hint.
      if (!selectedCategoryId) {
        const parents = listParentCategories(
          familyCategories,
          resolvedCurrentUserId ?? ""
        );
        const hint = (receipt.categoryHint || "").toLowerCase();
        const matched =
          parents.find((p) => hint && p.name.toLowerCase().includes(hint)) ??
          parents[0];
        if (matched) {
          setSelectedCategoryId(matched.id);
          setCategoryReady(true);
        }
      }

      if (
        receipt.fundId &&
        selectableFunds.some((f) => f.id === receipt.fundId)
      ) {
        setPaymentSource("fund");
        setSelectedFundId(receipt.fundId);
        if (!isSolo) setResponsibleFor("joint_fund");
      }

      if (receipt.total == null) {
        setScanHint(
          "Leímos el ticket, pero no vimos claro el total. Revísalo a mano."
        );
      } else if (receipt.confidence === "low") {
        setScanHint(
          receipt.rawNotes?.trim() ||
            "Revisa los datos: la lectura no está muy segura."
        );
      } else {
        setScanHint("Ticket leído. Revisa bolsillo, categoría y guarda.");
      }
      setShowKeypad(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "No se pudo leer el ticket."
      );
    } finally {
      setIsScanning(false);
      if (receiptInputRef.current) receiptInputRef.current.value = "";
    }
  }

  function openCategorySheet() {
    setIsCategorySheetOpen(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setIsSheetAnimated(true))
    );
  }

  function closeCategorySheet() {
    setIsSheetAnimated(false);
    setTimeout(() => {
      setIsCategorySheetOpen(false);
    }, 450);
  }

  const selectedCategoryRow = familyCategories.find(
    (c) => c.id === selectedCategoryId
  );
  const selectedCategoryParent = selectedCategoryRow?.parent_id
    ? familyCategories.find((c) => c.id === selectedCategoryRow.parent_id)
    : null;
  const selectedCategoryLabel = selectedCategoryRow
    ? selectedCategoryRow.parent_id
      ? `${selectedCategoryParent?.name ?? ""} · ${selectedCategoryRow.name}`
      : selectedCategoryRow.name
    : "Elegir categoría";
  const SelectedCategoryIcon = resolveCategoryIcon(
    selectedCategoryRow?.icon ?? selectedCategoryParent?.icon
  );

  const parentCategories = listParentCategories(
    familyCategories,
    resolvedCurrentUserId ?? ""
  );

  function categoryNameForSave() {
    return selectedCategoryRow?.name ?? "gasto";
  }

  function parseDecimal(value: string | number) {
    const safeValue = sanitizeDecimalInput(value);
    return safeValue ? Number.parseFloat(safeValue) : Number.NaN;
  }

  async function finishAfterSave() {
    setShowKeypad(false);
    setSplitEditSide(null);
    setSplitBelongOpen(false);
    setIsSheetAnimated(false);
    setIsCategorySheetOpen(false);

    const { syncFamilyExpenses } = await import("@/lib/realtimeFamily");
    const { requestFirstMoveCelebrationCheck } = await import(
      "@/components/PartnerFirstMoveCelebration"
    );

    if (onClose) {
      onClose();
      window.setTimeout(() => {
        void syncFamilyExpenses();
        requestFirstMoveCelebrationCheck();
      }, 460);
    } else {
      router.push("/");
      void syncFamilyExpenses();
      requestFirstMoveCelebrationCheck();
    }
  }

  async function saveBothSplitExpenses(params: {
    finalAmount: number;
    belong: BothSplitBelongChoice;
    fundId: string | null;
  }) {
    const mine = parseDecimal(myContribution);
    const partner = parseDecimal(partnerContribution);

    if (!Number.isFinite(mine) || mine < 0 || !Number.isFinite(partner) || partner < 0) {
      throw new Error("Ingresa cuánto puso cada persona.");
    }

    if (Math.round((mine + partner) * 100) !== Math.round(params.finalAmount * 100)) {
      throw new Error("La suma de ambos aportes debe coincidir con el monto total.");
    }

    if (paymentSource === "account") {
      throw new Error(
        "Si pagan entre los dos, registra el gasto desde un bolsillo o crea un movimiento por persona."
      );
    }

    const toShared = params.belong === "joint_fund";
    if (toShared && !params.fundId) {
      throw new Error("Elige el bolsillo compartido del gasto.");
    }

    const requests = [];

    if (mine > 0) {
      requests.push(
        saveExpenseAction({
          amount: mine,
          concept,
          paidBy: "me",
          responsibleFor: toShared ? "joint_fund" : "me",
          payerSharePct: 100,
          category: categoryNameForSave(),
          categoryId: selectedCategoryId!,
          date,
          fundId: toShared ? params.fundId : null,
          paidFromFund: false,
          splitTypeOverride: toShared ? "fund_transfer" : "personal",
        })
      );
    }

    if (partner > 0) {
      requests.push(
        saveExpenseAction({
          amount: partner,
          concept,
          paidBy: "partner",
          responsibleFor: toShared ? "joint_fund" : "partner",
          payerSharePct: 100,
          category: categoryNameForSave(),
          categoryId: selectedCategoryId!,
          date,
          fundId: toShared ? params.fundId : null,
          paidFromFund: false,
          splitTypeOverride: toShared ? "fund_transfer" : "personal",
        })
      );
    }

    await Promise.all(requests);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");

    const finalAmount = parseFloat(amount.toString().replace(/,/g, "."));

    if (isNaN(finalAmount) || finalAmount <= 0) {
      setErrorMessage("El importe debe ser mayor a 0");
      return;
    }

    if (!concept.trim()) {
      // Soft nudge with habitual concepts for the selected pocket — no hard error.
      setConceptSuggestOpen(true);
      return;
    }

    if (!selectedCategoryId) {
      setErrorMessage("Elige una categoría para el gasto.");
      openCategorySheet();
      return;
    }

    // 50/50: ask where the expense belongs before saving.
    if (!expenseToEdit && isCoupleMode && paidBy === "both_split") {
      const mine = parseDecimal(myContribution);
      const partner = parseDecimal(partnerContribution);
      if (!Number.isFinite(mine) || mine < 0 || !Number.isFinite(partner) || partner < 0) {
        setErrorMessage("Ingresa cuánto puso cada persona.");
        return;
      }
      if (Math.round((mine + partner) * 100) !== Math.round(finalAmount * 100)) {
        setErrorMessage("La suma de ambos aportes debe coincidir con el monto total.");
        return;
      }
      setSplitBelongFundId(
        selectedFundId ?? getDefaultSharedFund(sharedFunds)?.id ?? null
      );
      setSplitBelongChoice(
        sharedFunds.length > 0 ? splitBelongChoice : "each_personal"
      );
      setSplitBelongOpen(true);
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
        formData.set("category", categoryNameForSave());
        formData.set("category_id", selectedCategoryId ?? "");
        formData.set("expense_date", date);
        formData.set("paid_by", resolvedPaidByValue);
        formData.set("responsible_for", resolvedResponsibleForValue);

        const result = await editExpenseAction(formData);

        if (result?.error) {
          throw new Error(result.error);
        }
      } else {
        const singlePaidBy = (isCoupleMode ? paidBy : "me") as ExpenseActor;

        if (paymentSource === "account") {
          if (!selectedAccountId) {
            throw new Error("Elige la cuenta desde la que pagas.");
          }
          const result = await saveExpenseAction({
            amount: finalAmount,
            concept,
            paidBy: singlePaidBy === "joint_fund" ? "me" : singlePaidBy,
            responsibleFor: "me",
            payerSharePct: 100,
            category: categoryNameForSave(),
            categoryId: selectedCategoryId!,
            date,
            accountId: selectedAccountId,
            paidFromAccount: true,
            paidFromFund: false,
            fundId: null,
          });
          if (result && "balanceWarning" in result && result.balanceWarning) {
            setBalanceWarning(
              "La cuenta queda en negativo. El gasto se guardó; revísalo cuando puedas."
            );
          }
        } else {
          const splitTypeOverride =
            responsibleFor === "joint_fund"
              ? "fund_transfer"
              : responsibleFor === "partner" && singlePaidBy === "me"
                ? "p2p_debt"
                : responsibleFor === "me" && singlePaidBy === "partner"
                  ? "p2p_debt"
                  : "personal";

          const soloFundId =
            isSolo && paymentSource === "fund"
              ? selectedFundId ??
                getPersonalFund(personalFunds, resolvedCurrentUserId ?? "")
                  ?.id ??
                null
              : null;

          await saveExpenseAction({
            amount: finalAmount,
            concept,
            paidBy: singlePaidBy,
            responsibleFor: isCoupleMode ? responsibleFor : "me",
            payerSharePct: 100,
            category: categoryNameForSave(),
            categoryId: selectedCategoryId!,
            date,
            splitTypeOverride,
            fundId: isSolo
              ? soloFundId
              : (isCoupleMode ? responsibleFor : "me") === "joint_fund"
                ? selectedFundId
                : null,
            paidFromFund: isSolo
              ? Boolean(soloFundId)
              : singlePaidBy === "joint_fund",
          });
        }
      }

      await finishAfterSave();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo guardar el gasto."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmBothSplitBelong() {
    const finalAmount = parseFloat(amount.toString().replace(/,/g, "."));
    setErrorMessage("");
    try {
      setIsSaving(true);
      await saveBothSplitExpenses({
        finalAmount,
        belong: splitBelongChoice,
        fundId: splitBelongFundId,
      });
      await finishAfterSave();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo guardar el gasto."
      );
      setSplitBelongOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  const selectedFund =
    selectableFunds.find((fund) => fund.id === selectedFundId) ??
    (isSolo
      ? getPersonalFund(personalFunds, resolvedCurrentUserId ?? "")
      : getDefaultSharedFund(sharedFunds)) ??
    selectableFunds[0] ??
    null;
  const selectedPayableAccount =
    payableAccounts.find((a) => a.id === selectedAccountId) ?? null;
  const amountAccent =
    paymentSource === "account" && selectedPayableAccount
      ? resolveAccountColor(selectedPayableAccount)
      : (isSolo && paymentSource === "fund") ||
          (!isSolo && responsibleFor === "joint_fund")
        ? resolveFundColor(selectedFund)
        : isDark
          ? "#c4a574"
          : "#1c2740";

  const conceptSuggestFundId =
    paymentSource === "fund" &&
    (isSolo || responsibleFor === "joint_fund" || paidBy === "both_split")
      ? selectedFundId
      : null;

  const conceptSuggestions = useMemo(
    () =>
      frequentConceptsForFund(storeExpenses, {
        fundId: conceptSuggestFundId,
        limit: 6,
      }),
    [storeExpenses, conceptSuggestFundId]
  );

  const conceptSuggestFundLabel =
    conceptSuggestFundId && selectedFund
      ? isSolo
        ? personalFundDisplayName(selectedFund)
        : selectedFund.name
      : null;

  useEffect(() => {
    if (!autoSubmitAfterConceptRef.current) return;
    if (!concept.trim()) return;
    // Wait until category is ready after the concept pick.
    if (!categoryReady || !selectedCategoryId) return;
    autoSubmitAfterConceptRef.current = false;
    formRef.current?.requestSubmit();
  }, [concept, categoryReady, selectedCategoryId]);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      aria-busy={isScanning}
      className="relative flex h-full min-h-0 flex-col text-on-surface"
    >
      {isScanning ? (
        <div
          className="absolute inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-surface-lowest/78 px-6 backdrop-blur-md animate-in fade-in duration-300"
          role="status"
          aria-live="assertive"
          aria-label="Escaneando la factura"
        >
          <div className="relative flex h-[4.25rem] w-[4.25rem] items-center justify-center">
            <span
              className="receipt-scan-pulse absolute inset-0 rounded-full border border-[#c4a574]/40"
              aria-hidden
            />
            <span
              className="absolute inset-1.5 rounded-full border-[0.5px] border-[#c4a574]/55"
              aria-hidden
            />
            <Camera
              size={22}
              strokeWidth={1.5}
              className="relative text-[#c4a574]"
              aria-hidden
            />
          </div>
          <div className="max-w-[17rem] text-center">
            <p className="text-[15px] font-light tracking-tight text-on-surface">
              Escaneando la factura
            </p>
            <p className="mt-1.5 text-[12px] font-light leading-relaxed text-on-surface-variant">
              Un momento, por favor. Estamos leyendo el ticket…
            </p>
            {scanBusyPrompt || scanBusyTyping ? (
              <p
                className="mt-3 min-h-[2.75rem] text-[11px] font-light leading-relaxed text-on-surface-variant/90"
                aria-live="polite"
              >
                {scanBusyPrompt}
                {scanBusyTyping ? (
                  <span
                    className="ml-0.5 inline-block h-[0.85em] w-px translate-y-[0.1em] bg-[#c4a574]/80 align-baseline animate-pulse"
                    aria-hidden
                  />
                ) : null}
              </p>
            ) : null}
          </div>
          <div
            className="relative h-px w-32 overflow-hidden rounded-full bg-outline-variant/20"
            aria-hidden
          >
            <div className="receipt-scan-sweep absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#c4a574] to-transparent" />
          </div>
        </div>
      ) : null}

      <main
        className={`mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col gap-2.5 overflow-hidden ${
          isScanning ? "pointer-events-none select-none" : ""
        }`}
      >
        {!hideChromeTitle ? (
          <section className="px-0.5">
            <h1 className="text-base font-medium tracking-tight text-on-surface">
              {expenseToEdit ? "Editar gasto" : "Nuevo gasto"}
            </h1>
            <p className="text-xs text-on-surface/70">
              {expenseToEdit ? "Actualiza el movimiento." : "Registra un nuevo movimiento."}
            </p>
          </section>
        ) : null}

        <section
          data-tour="expense-amount"
          className="flex flex-col items-center gap-2.5 rounded-[1.35rem] border border-glass-border bg-surface-low/80 p-3.5 shadow-[0_10px_28px_rgba(43,52,55,0.08)] backdrop-blur-md"
          style={{
            backgroundImage: tintedGlassGradient(amountAccent, {
              midAlpha: "14",
              endAlpha: "22",
            }),
          }}
        >
          <div className="flex w-full flex-col items-center text-center">
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface/80">
                Importe
              </span>
              <button
                type="button"
                disabled={isScanning || isSaving}
                onClick={() => receiptInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-light text-accent transition-opacity hover:opacity-90 disabled:opacity-50"
                aria-label="Escanear ticket, foto o factura PDF"
              >
                <Camera size={12} strokeWidth={1.75} aria-hidden />
                {isScanning ? "Leyendo…" : "Escanear"}
              </button>
              <input
                ref={receiptInputRef}
                type="file"
                accept="image/*,application/pdf,.pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void handleReceiptFile(file);
                }}
              />
            </div>
            <button
              type="button"
              disabled={isScanning || isSaving}
              onClick={() => {
                setSplitEditSide(null);
                setShowKeypad(true);
              }}
              className="mt-1 flex items-baseline justify-center gap-1.5 border-none bg-transparent outline-none disabled:pointer-events-none"
            >
              {currencyMeta.symbolPosition === "before" ? (
                <span className="text-[1.75rem] font-light" style={{ color: amountAccent }}>
                  {currencyMeta.symbol}
                </span>
              ) : null}
              <span className="text-[2.75rem] font-light leading-none tracking-tight text-on-surface">
                {Number.isNaN(parseDecimal(amount)) || parseDecimal(amount) <= 0 ? (
                  <span className="text-on-surface/35">
                    <SoftDecimals>{formatAmountDisplay(0)}</SoftDecimals>
                  </span>
                ) : (
                  <SoftDecimals>
                    {formatAmountDisplay(parseDecimal(amount))}
                  </SoftDecimals>
                )}
              </span>
              {currencyMeta.symbolPosition === "after" ? (
                <span className="text-[1.75rem] font-light" style={{ color: amountAccent }}>
                  {currencyMeta.symbol}
                </span>
              ) : null}
            </button>
          </div>

          {scanHint ? (
            <p className="w-full text-center text-[11px] font-light text-accent/90">
              {scanHint}
            </p>
          ) : null}

          <div
            data-tour="expense-concept"
            className="flex w-full items-center gap-2 border-t border-glass-border pt-2.5"
          >
            <PencilLine size={15} className="shrink-0 text-on-surface/70" />
            <input
              type="text"
              value={concept}
              onChange={(e) => {
                const next = e.target.value;
                setConcept(next);
                // Clearing the concept allows AI again; a manual pick stays locked.
              }}
              placeholder="¿En qué gastaste?"
              className="w-full border-none bg-transparent text-[15px] font-semibold text-on-surface outline-none placeholder:font-medium placeholder:text-on-surface/40 focus:ring-0"
            />
          </div>
        </section>

        {(payableAccounts.length > 0 || (isSolo && personalFunds.length > 0)) && (
          <section className="px-0.5" data-tour="expense-pay-from">
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-on-surface/55">
              Pagar desde
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPaymentSource("fund");
                  setBalanceWarning("");
                }}
                className={`flex items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${getSelectorClasses(
                  paymentSource === "fund",
                  false
                )}`}
              >
                <Wallet size={13} />
                Bolsillo
              </button>
              {payableAccounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentSource("account");
                    setBalanceWarning("");
                    if (paidBy === "joint_fund" || paidBy === "both_split") {
                      setPaidBy("me");
                    }
                    if (!isSolo) setResponsibleFor("me");
                  }}
                  className={`flex items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${getSelectorClasses(
                    paymentSource === "account",
                    false
                  )}`}
                >
                  <Landmark size={13} />
                  Cuenta
                </button>
              )}
            </div>

            {isSolo && paymentSource === "fund" && personalFunds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-2">
                {personalFunds.map((fund) => {
                  const isSelected = selectedFundId === fund.id;
                  const fundColor = resolveFundColor(fund);
                  const label = personalFundDisplayName(fund);
                  return (
                    <button
                      key={fund.id}
                      type="button"
                      onClick={() => setSelectedFundId(fund.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-md transition-all ${
                        isSelected
                          ? "text-on-surface"
                          : "border-glass-border bg-surface-low text-on-surface/65 hover:bg-surface-container"
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
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {paymentSource === "account" && (
              <div className="mt-2 flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-top-2">
                {payableAccounts.map((account) => {
                  const isSelected = selectedAccountId === account.id;
                  const accountColor = resolveAccountColor(account);
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setSelectedAccountId(account.id)}
                      aria-pressed={isSelected}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all ${
                        isSelected
                          ? "font-semibold text-on-surface shadow-[0_4px_14px_rgba(43,52,55,0.12)]"
                          : "border-glass-border bg-surface-low font-medium text-on-surface/60 hover:bg-surface-container hover:text-on-surface/80"
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundImage: tintedGlassGradient(accountColor, {
                                midAlpha: "42",
                                endAlpha: "55",
                                endOnly: true,
                              }),
                              borderColor: accountColor,
                              boxShadow: `0 0 0 1.5px ${accountColor}66, 0 4px 14px rgba(43,52,55,0.10)`,
                              color: accountColor,
                            }
                          : undefined
                      }
                    >
                      <span
                        className={`shrink-0 rounded-full ring-1 ring-black/10 ${
                          isSelected ? "h-2.5 w-2.5" : "h-2 w-2"
                        }`}
                        style={{ backgroundColor: accountColor }}
                      />
                      {account.name}
                      {isSelected ? (
                        <CheckCircle2 size={13} strokeWidth={2} className="shrink-0 opacity-90" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {!isSolo && (
          <>
            <section className="px-0.5">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-on-surface/55">
                Pagado por
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(paymentSource === "account"
                  ? paidByOptions.filter((o) => o.value === "me" || o.value === "partner")
                  : paidByOptions
                ).map(({ value, label, icon: Icon }) => {
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

              {paymentSource === "fund" && paidBy === "both_split" && (
                <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                  <p className="text-[11px] font-light text-on-surface-variant">
                    A medias por defecto. Toca una cápsula para ajustar; el otro
                    queda con la diferencia.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowKeypad(false);
                        setSplitEditSide("me");
                      }}
                      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${getSelectorClasses(
                        splitEditSide === "me",
                        false
                      )}`}
                    >
                      <User size={13} />
                      <span>Tú</span>
                      <span className="font-semibold tabular-nums text-on-surface">
                        {currencyMeta.symbolPosition === "before"
                          ? `${currencyMeta.symbol}${formatAmountDisplay(
                              Number.isFinite(parseDecimal(myContribution))
                                ? parseDecimal(myContribution)
                                : 0
                            )}`
                          : `${formatAmountDisplay(
                              Number.isFinite(parseDecimal(myContribution))
                                ? parseDecimal(myContribution)
                                : 0
                            )}${currencyMeta.symbol}`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowKeypad(false);
                        setSplitEditSide("partner");
                      }}
                      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${getSelectorClasses(
                        splitEditSide === "partner",
                        false
                      )}`}
                    >
                      <Heart size={13} />
                      <span className="truncate">{resolvedPartnerFirstName}</span>
                      <span className="font-semibold tabular-nums text-on-surface">
                        {currencyMeta.symbolPosition === "before"
                          ? `${currencyMeta.symbol}${formatAmountDisplay(
                              Number.isFinite(parseDecimal(partnerContribution))
                                ? parseDecimal(partnerContribution)
                                : 0
                            )}`
                          : `${formatAmountDisplay(
                              Number.isFinite(parseDecimal(partnerContribution))
                                ? parseDecimal(partnerContribution)
                                : 0
                            )}${currencyMeta.symbol}`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </section>

            {paymentSource === "fund" && paidBy !== "both_split" && (
              <section className="px-0.5">
                <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-on-surface/55">
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
                              : "border-glass-border bg-surface-low text-on-surface/65 hover:bg-surface-container hover:text-on-surface/80"
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
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        <div
          data-tour="expense-category"
          className="flex overflow-hidden rounded-2xl border border-glass-border bg-surface-low shadow-[0_8px_20px_rgba(43,52,55,0.06)] backdrop-blur-md"
        >
          <button
            type="button"
            onClick={openCategorySheet}
            className="flex flex-1 items-center justify-between gap-2 px-3 py-2.5 text-left"
          >
            <span className="text-[11px] font-medium uppercase tracking-wide text-on-surface/55">
              Categoría
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-on-surface">
              <span
                className="icon-chip-fund icon-chip-coin inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
                style={fundIconChipStyle(
                  selectedCategoryRow?.color ||
                    selectedCategoryParent?.color ||
                    amountAccent
                )}
              >
                <SelectedCategoryIcon size={11} strokeWidth={1.85} />
              </span>
              <span className="truncate">{selectedCategoryLabel}</span>
            </span>
          </button>

          <div className="w-px self-stretch bg-outline-variant/25" />

          <label
            htmlFor="expense-date"
            className="flex flex-1 cursor-pointer items-center justify-between gap-2 px-3 py-2.5"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <CalendarDays size={14} className="shrink-0 text-on-surface/60" />
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

        {balanceWarning && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            {balanceWarning}
          </div>
        )}

        {errorMessage && (
          <div className="alert-error rounded-xl px-3 py-2 text-xs">
            {errorMessage}
          </div>
        )}
      </main>

      <footer
        className={`mt-3 shrink-0 ${isScanning ? "pointer-events-none select-none" : ""}`}
      >
        <button
          type="submit"
          disabled={isScanning || isSaving || !selectedCategoryId}
          className="fab-ink flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
              className={`relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-glass-border glass-sheet transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isSheetAnimated
                  ? "translate-y-0 opacity-100"
                  : "translate-y-full opacity-0"
              }`}
            >
              <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-outline-variant/40" />

              <div className="relative flex shrink-0 items-center justify-center px-5 pb-2 pt-3">
                <p className="text-base font-medium tracking-tight text-on-surface">
                  Categoría
                </p>
                <button
                  type="button"
                  onClick={closeCategorySheet}
                  className="absolute right-4 top-2 flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/25 bg-glass-strong text-on-surface-variant shadow-sm backdrop-blur-sm"
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
                <p className="mb-4 text-[13px] font-light text-on-surface-variant">
                  Elige categoría (y subcategoría si tiene). El presupuesto mira
                  la categoría padre.
                </p>
                {parentCategories.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">
                    Crea categorías en el menú → Categorías.
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-5 gap-x-2 gap-y-3">
                      {parentCategories.map((parent) => {
                        const subs = listSubcategories(
                          familyCategories,
                          parent.id,
                          resolvedCurrentUserId ?? ""
                        );
                        const parentSelected =
                          selectedCategoryId === parent.id ||
                          subs.some((s) => s.id === selectedCategoryId);
                        const ParentIcon = resolveCategoryIcon(parent.icon);
                        const chipColor = parent.color || amountAccent;
                        return (
                          <button
                            key={parent.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategoryId(parent.id);
                              setCategoryReady(true);
                              if (subs.length === 0) closeCategorySheet();
                            }}
                            className="flex flex-col items-center gap-1.5"
                          >
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm backdrop-blur-md transition-all ${
                                parentSelected
                                  ? "border-transparent text-white shadow-md"
                                  : "border-glass-border bg-surface-low text-on-surface"
                              }`}
                              style={
                                parentSelected
                                  ? { backgroundColor: chipColor }
                                  : undefined
                              }
                            >
                              <ParentIcon size={18} strokeWidth={1.6} />
                            </div>
                            <span
                              className={`w-full truncate text-center text-[10px] font-medium tracking-wide ${
                                parentSelected
                                  ? "font-semibold text-on-surface"
                                  : "text-on-surface/80"
                              }`}
                            >
                              {parent.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {(() => {
                      const activeParent =
                        parentCategories.find((p) => p.id === selectedCategoryId) ??
                        parentCategories.find((p) =>
                          listSubcategories(
                            familyCategories,
                            p.id,
                            resolvedCurrentUserId ?? ""
                          ).some((s) => s.id === selectedCategoryId)
                        );
                      if (!activeParent) return null;
                      const subs = listSubcategories(
                        familyCategories,
                        activeParent.id,
                        resolvedCurrentUserId ?? ""
                      );
                      if (subs.length === 0) return null;
                      return (
                        <div className="rounded-2xl border-[0.5px] border-outline-variant/20 px-3 py-2.5">
                          <p className="mb-2 text-[11px] font-light text-on-surface-variant">
                            Subcategoría de {activeParent.name}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {subs.map((sub) => (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCategoryId(sub.id);
                                  setCategoryReady(true);
                                  closeCategorySheet();
                                }}
                                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                                  selectedCategoryId === sub.id
                                    ? "border-primary/40 bg-primary/10 font-semibold text-on-surface"
                                    : "border-outline-variant/25 text-on-surface-variant"
                                }`}
                              >
                                {sub.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      <ConceptSuggestModal
        open={conceptSuggestOpen}
        fundLabel={conceptSuggestFundLabel}
        suggestions={conceptSuggestions}
        onClose={() => setConceptSuggestOpen(false)}
        onPick={(next) => {
          autoSubmitAfterConceptRef.current = true;
          setConcept(next.slice(0, 80));
          setConceptSuggestOpen(false);
        }}
      />

      <BothSplitBelongModal
        open={splitBelongOpen}
        partnerFirstName={resolvedPartnerFirstName}
        sharedFunds={sharedFunds}
        choice={splitBelongChoice}
        fundId={splitBelongFundId}
        confirming={isSaving}
        onChoiceChange={setSplitBelongChoice}
        onFundChange={setSplitBelongFundId}
        onClose={() => {
          if (!isSaving) setSplitBelongOpen(false);
        }}
        onConfirm={() => {
          void confirmBothSplitBelong();
        }}
      />

      <NumericKeypadSheet
        isOpen={showKeypad && splitEditSide === null}
        title="Importe del gasto"
        subtitle={
          isSolo && paymentSource === "fund"
            ? personalFundDisplayName(selectedFund)
            : !isSolo && responsibleFor === "joint_fund"
              ? selectedFund?.name ?? "Bolsillo"
              : undefined
        }
        accentColor={amountAccent}
        initialValue={amount || "0"}
        onClose={() => setShowKeypad(false)}
        onValueChange={(value) => setAmount(sanitizeDecimalInput(value))}
        onConfirm={() => setShowKeypad(false)}
      />

      <NumericKeypadSheet
        isOpen={splitEditSide !== null}
        title={
          splitEditSide === "partner"
            ? `Aporte de ${resolvedPartnerFirstName}`
            : "Tu aporte"
        }
        subtitle={(() => {
          const total = parseDecimal(amount);
          const safe = Number.isFinite(total) && total > 0 ? total : 0;
          const formatted = formatAmountDisplay(safe);
          const withSymbol =
            currencyMeta.symbolPosition === "before"
              ? `${currencyMeta.symbol}${formatted}`
              : `${formatted}${currencyMeta.symbol}`;
          return `Valor del importe total ${withSymbol}`;
        })()}
        accentColor={amountAccent}
        initialValue={
          (splitEditSide === "partner" ? partnerContribution : myContribution) ||
          "0"
        }
        maxValue={
          Number.isFinite(parseDecimal(amount)) && parseDecimal(amount) > 0
            ? parseDecimal(amount)
            : 0
        }
        onClose={() => setSplitEditSide(null)}
        onValueChange={() => {
          /* Draft stays on the keypad until confirm; partner updates then. */
        }}
        onConfirm={(value) => {
          const total = parseDecimal(amount);
          const safeTotal =
            Number.isFinite(total) && total > 0 ? total : 0;
          let next = parseDecimal(sanitizeDecimalInput(value ?? "0"));
          if (!Number.isFinite(next) || next < 0) next = 0;
          if (Math.round(next * 100) > Math.round(safeTotal * 100)) {
            return;
          }
          next = Math.round(next * 100) / 100;
          const other = Math.round((safeTotal - next) * 100) / 100;
          if (splitEditSide === "partner") {
            setPartnerContribution(String(next));
            setMyContribution(String(other));
          } else {
            setMyContribution(String(next));
            setPartnerContribution(String(other));
          }
          setSplitEditSide(null);
        }}
      />

      <ProductTour
        open={expenseTour.open}
        steps={expenseTour.steps}
        onClose={expenseTour.close}
      />
    </form>
  );
}
