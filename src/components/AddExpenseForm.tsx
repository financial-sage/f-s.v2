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
  type ExpenseCategory,
  type ExpenseResponsibleFor,
} from "@/app/actions/expenses";
import { SoftDecimals } from "@/components/FormattedCurrency";
import { editExpenseAction } from "@/app/actions/editExpense";
import BothSplitBelongModal, {
  type BothSplitBelongChoice,
} from "@/components/BothSplitBelongModal";
import ConceptSuggestModal from "@/components/ConceptSuggestModal";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { useExpenseModal, type ExpenseToEdit } from "@/components/ExpenseModalProvider";
import { DEFAULT_CATEGORY_ID } from "@/lib/categories/suggest";
import { frequentConceptsForFund } from "@/lib/expenses/frequent-concepts";
import { topCategories, extraCategories, type CategoryTile } from "@/lib/categoryMap";
import { createClient } from "@/utils/supabase/client";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useFundsStore } from "@/store/useFundsStore";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useCategories } from "@/hooks/useCategories";
import {
  getDefaultSharedFund,
  getPersonalFund,
  listSoloDashboardFunds,
  listVariableSharedFunds,
  personalFundDisplayName,
  resolveFundColor,
  type FamilyFund,
} from "@/lib/funds";
import type { FamilyAccount } from "@/lib/accounts";
import { listOperableAccountsForUser, resolveAccountColor } from "@/lib/accounts";
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

function resolveInitialOperableAccounts(userId: string | null) {
  if (!userId) return [];
  return listOperableAccountsForUser(useAccountsStore.getState().accounts, userId);
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

function getCategoryIdFromValue(category?: string | null) {
  const found = [...topCategories, ...extraCategories].find(
    (option) => option.id === category || option.value === category
  );
  if (found) return found.id;
  if (category === "food") return "dining";
  return DEFAULT_CATEGORY_ID;
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
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORY_ID);
  /** User picked a category manually — don't overwrite with AI. */
  const [categoryLockedByUser, setCategoryLockedByUser] = useState(false);
  const categoryLockedRef = useRef(false);
  const [categorySuggesting, setCategorySuggesting] = useState(false);
  /** Save stays disabled until AI (or fund fallback) resolves a category. */
  const [categoryReady, setCategoryReady] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [isSaving, setIsSaving] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isSheetAnimated, setIsSheetAnimated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [balanceWarning, setBalanceWarning] = useState("");
  const [isScanning, setIsScanning] = useState(false);
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
  const operableAccounts = useMemo(() => {
    if (!resolvedCurrentUserId) return [] as FamilyAccount[];
    return listOperableAccountsForUser(storeAccounts, resolvedCurrentUserId);
  }, [storeAccounts, resolvedCurrentUserId]);
  const [paymentSource, setPaymentSource] = useState<PaymentSource>("fund");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(() => {
    const operable = resolveInitialOperableAccounts(resolveInitialUserId(currentUserId));
    return operable[0]?.id ?? null;
  });

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
    setSelectedAccountId((prev) => prev ?? operableAccounts[0]?.id ?? null);
  }, [operableAccounts]);

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
    if (expenseToEdit && resolvedCurrentUserId) {
      const hydratedAmount = expenseToEdit.amount?.toString() ?? "0";
      const hydratedDate = (expenseToEdit as ExpenseToEdit & { expense_date?: string | null })
        .expense_date;

      setAmount(sanitizeDecimalInput(hydratedAmount));
      setConcept(expenseToEdit.concept ?? "");
      setSelectedCategory(getCategoryIdFromValue(expenseToEdit.category));
      setCategoryLockedByUser(true);
      setCategoryReady(true);
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
    setSelectedCategory(DEFAULT_CATEGORY_ID);
    setCategoryLockedByUser(false);
    setCategorySuggesting(false);
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

  useEffect(() => {
    categoryLockedRef.current = categoryLockedByUser;
  }, [categoryLockedByUser]);

  // AI category suggestion from "¿En qué gastaste?" (+ fund fallback).
  useEffect(() => {
    if (expenseToEdit || categoryLockedRef.current) {
      setCategorySuggesting(false);
      setCategoryReady(true);
      return;
    }

    const trimmed = concept.trim();
    const fundName =
      paymentSource === "fund"
        ? selectableFunds.find((f) => f.id === selectedFundId)?.name ?? null
        : null;

    if (trimmed.length < 2) {
      setCategorySuggesting(false);
      setCategoryReady(false);
      // Empty concept → follow selected pocket when possible.
      if (fundName) {
        void import("@/lib/categories/suggest").then(({ categoryIdFromFundName }) => {
          if (!categoryLockedRef.current) {
            setSelectedCategory(categoryIdFromFundName(fundName));
          }
        });
      } else if (!categoryLockedRef.current) {
        setSelectedCategory(DEFAULT_CATEGORY_ID);
      }
      return;
    }

    setCategoryReady(false);
    setCategorySuggesting(true);

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (categoryLockedRef.current) {
        setCategorySuggesting(false);
        setCategoryReady(true);
        return;
      }
      try {
        const res = await fetch("/api/categories/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concept: trimmed, fundName }),
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => ({}))) as {
          categoryId?: string;
        };
        if (!categoryLockedRef.current) {
          if (data.categoryId) {
            setSelectedCategory(data.categoryId);
          } else {
            const { categoryIdFromFundName } = await import(
              "@/lib/categories/suggest"
            );
            setSelectedCategory(categoryIdFromFundName(fundName));
          }
          setCategoryReady(true);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!categoryLockedRef.current) {
          const { categoryIdFromFundName } = await import(
            "@/lib/categories/suggest"
          );
          setSelectedCategory(categoryIdFromFundName(fundName));
          setCategoryReady(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCategorySuggesting(false);
        }
      }
    }, 650);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    concept,
    categoryLockedByUser,
    expenseToEdit,
    paymentSource,
    selectedFundId,
    selectableFunds,
  ]);

  function mapCategoryHint(hint: string | null | undefined): string | null {
    if (!hint) return null;
    const key = hint.trim().toLowerCase();
    // Map to category tile ids used by the form.
    const aliases: Record<string, string> = {
      food: "dining",
      comida: "dining",
      groceries: "super",
      transport: "transport",
      transporte: "transport",
      home: "home",
      hogar: "home",
      health: "health",
      salud: "health",
      leisure: "cinema",
      ocio: "cinema",
      shopping: "super",
      compras: "super",
      other: "misc",
      otros: "misc",
    };
    return aliases[key] ?? null;
  }

  async function handleReceiptFile(file: File | null) {
    if (!file) return;
    setIsScanning(true);
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
        setCategoryLockedByUser(false);
      }
      if (receipt.date) setDate(receipt.date.slice(0, 10));

      const mappedCategory =
        (receipt.categoryId &&
        [...topCategories, ...extraCategories].some(
          (c) => c.id === receipt.categoryId
        )
          ? receipt.categoryId
          : null) || mapCategoryHint(receipt.categoryHint);
      if (mappedCategory) {
        setSelectedCategory(mappedCategory);
        setCategoryLockedByUser(true);
        setCategoryReady(true);
        setCategorySuggesting(false);
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
          category: selectedCategory,
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
          category: selectedCategory,
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
      const message = "El importe debe ser mayor a 0";
      setErrorMessage(message);
      window.alert(message);
      return;
    }

    if (!concept.trim()) {
      // Soft nudge with habitual concepts for the selected pocket — no hard error.
      setConceptSuggestOpen(true);
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
        formData.set("category", selectedCategory);
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
            category: selectedCategory,
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
            category: selectedCategory,
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
  const amountAccent =
    (isSolo && paymentSource === "fund") ||
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
    // Wait until AI (or manual lock) settles the category after the pick.
    if (!categoryReady || categorySuggesting) return;
    autoSubmitAfterConceptRef.current = false;
    formRef.current?.requestSubmit();
  }, [concept, categoryReady, categorySuggesting]);

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex h-full min-h-0 flex-col text-on-surface"
    >
      <main className="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
        <section className="px-0.5">
          <h1 className="text-base font-medium tracking-tight text-on-surface">
            {expenseToEdit ? "Editar gasto" : "Nuevo gasto"}
          </h1>
          <p className="text-xs text-on-surface/70">
            {expenseToEdit ? "Actualiza el movimiento." : "Registra un nuevo movimiento."}
          </p>
        </section>

        <section
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
              onClick={() => {
                setSplitEditSide(null);
                setShowKeypad(true);
              }}
              className="mt-1 flex items-baseline justify-center gap-1.5 border-none bg-transparent outline-none"
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

          <div className="flex w-full items-center gap-2 border-t border-glass-border pt-2.5">
            <PencilLine size={15} className="shrink-0 text-on-surface/70" />
            <input
              type="text"
              value={concept}
              onChange={(e) => {
                const next = e.target.value;
                setConcept(next);
                // Clearing the concept allows AI again; a manual pick stays locked.
                if (!next.trim() && categoryLockedByUser) {
                  setCategoryLockedByUser(false);
                }
              }}
              placeholder="¿En qué gastaste?"
              className="w-full border-none bg-transparent text-[15px] font-semibold text-on-surface outline-none placeholder:font-medium placeholder:text-on-surface/40 focus:ring-0"
            />
          </div>
        </section>

        {(operableAccounts.length > 0 || (isSolo && personalFunds.length > 0)) && (
          <section className="px-0.5">
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
              {operableAccounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentSource("account");
                    if (paidBy === "joint_fund" || paidBy === "both_split") {
                      setPaidBy("me");
                    }
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
              <div className="mt-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                <div className="rounded-xl border border-primary/20 bg-primary/8 px-3 py-2 text-[11px] leading-relaxed text-on-surface">
                  Suele ser más claro pagar desde un bolsillo: así ves de qué parte del presupuesto sale.
                  Si lo pagas desde la cuenta, el bolsillo no se toca.
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {operableAccounts.map((account) => {
                    const isSelected = selectedAccountId === account.id;
                    const accountColor = resolveAccountColor(account);
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => setSelectedAccountId(account.id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-md transition-all ${
                          isSelected
                            ? "text-on-surface"
                            : "border-glass-border bg-surface-low text-on-surface/65 hover:bg-surface-container hover:text-on-surface/80"
                        }`}
                        style={
                          isSelected
                            ? {
                                backgroundImage: tintedGlassGradient(accountColor, {
                                  midAlpha: "28",
                                  endOnly: true,
                                }),
                                borderColor: `${accountColor}55`,
                                color: accountColor,
                              }
                            : undefined
                        }
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10"
                          style={{ backgroundColor: accountColor }}
                        />
                        {account.name}
                      </button>
                    );
                  })}
                </div>
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

        <div className="flex overflow-hidden rounded-2xl border border-glass-border bg-surface-low shadow-[0_8px_20px_rgba(43,52,55,0.06)] backdrop-blur-md">
          <button
            type="button"
            onClick={openCategorySheet}
            className="flex flex-1 items-center justify-between gap-2 px-3 py-2.5 text-left"
          >
            <span className="text-[11px] font-medium uppercase tracking-wide text-on-surface/55">
              Categoría
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-on-surface">
              {categorySuggesting ? (
                <Sparkles
                  size={14}
                  className="shrink-0 animate-pulse text-accent"
                  strokeWidth={1.75}
                />
              ) : (
                <SelectedCategoryIcon size={15} style={{ color: amountAccent }} />
              )}
              <span className="truncate">{selectedCategoryItem.label}</span>
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

      <footer className="mt-3 shrink-0">
        <button
          type="submit"
          disabled={
            isSaving ||
            (!expenseToEdit &&
              (categorySuggesting ||
                (concept.trim().length >= 2 && !categoryReady)))
          }
          className="fab-ink flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : categorySuggesting && !expenseToEdit ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : (
            <CheckCircle2 size={17} />
          )}
          {isSaving
            ? expenseToEdit
              ? "Actualizando..."
              : "Guardando..."
            : categorySuggesting && !expenseToEdit
              ? "Eligiendo categoría…"
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
                isSheetAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
              }`}
            >
              <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-outline-variant/40" />

              <div className="relative flex shrink-0 items-center justify-center px-5 pb-2 pt-3">
                <p className="text-base font-medium tracking-tight text-on-surface">Categoría</p>
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
                            setCategoryLockedByUser(true);
                            setCategoryReady(true);
                            setCategorySuggesting(false);
                            closeCategorySheet();
                          }}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm backdrop-blur-md transition-all ${
                              isSelected
                                ? "border-transparent text-white shadow-md"
                                : "border-glass-border bg-surface-low text-on-surface"
                            }`}
                            style={isSelected ? { backgroundColor: amountAccent } : undefined}
                          >
                            <Icon size={18} strokeWidth={1.6} />
                          </div>
                          <span
                            className={`w-full truncate text-center text-[10px] font-medium tracking-wide ${
                              isSelected ? "font-semibold text-on-surface" : "text-on-surface/80"
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
                                setCategoryLockedByUser(true);
                                setCategoryReady(true);
                                setCategorySuggesting(false);
                                closeCategorySheet();
                              }}
                              className="flex flex-col items-center gap-1.5"
                            >
                              <div
                                className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm backdrop-blur-md transition-all ${
                                  isSelected
                                    ? "border-transparent text-white shadow-md"
                                    : "border-glass-border bg-surface-low text-on-surface"
                                }`}
                                style={isSelected ? { backgroundColor: amountAccent } : undefined}
                              >
                                <Icon size={18} strokeWidth={1.6} />
                              </div>
                              <span
                                className={`w-full truncate text-center text-[10px] font-medium tracking-wide ${
                                  isSelected ? "font-semibold text-on-surface" : "text-on-surface/80"
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
                              : "border-glass-border bg-surface-low text-on-surface"
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
                            isExpanded ? "font-semibold text-on-surface" : "text-on-surface/80"
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

      <ConceptSuggestModal
        open={conceptSuggestOpen}
        fundLabel={conceptSuggestFundLabel}
        suggestions={conceptSuggestions}
        onClose={() => setConceptSuggestOpen(false)}
        onPick={(next) => {
          autoSubmitAfterConceptRef.current = true;
          setConcept(next.slice(0, 80));
          setConceptSuggestOpen(false);
          // Unlock AI category so it can match the chosen concept.
          setCategoryLockedByUser(false);
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
    </form>
  );
}
