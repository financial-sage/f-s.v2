"use client";

import { FormattedCurrency } from "@/components/FormattedCurrency";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useExpenseStore } from "@/store/useExpenseStore";
import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Edit,
    Lock,
    SlidersHorizontal,
    Ticket,
    Trash2,
    X,
} from "lucide-react";
import { useExpenseModal } from "@/components/ExpenseModalProvider";
import {
    ExpenseDebtStatus,
    isFundSettlementConcept,
} from "@/components/ExpenseDebtStatus";
import { deleteExpenseAction } from "@/app/actions/expenses";
import {
    getPurchaseReceiptDetailForExpenseAction,
    listPurchaseReceiptExpenseIdsAction,
    type PurchaseCompareResult,
} from "@/app/actions/purchase-receipts";
import { resolveExpenseCategoryIcon } from "@/lib/familyCategories";
import type { ExpenseSplitType } from "@/lib/expenses";
import {
    calculatePersonalPocketBalance,
    DEFAULT_PERSONAL_FUND_COLOR,
    fundIconChipStyle,
    getPersonalFund,
    listVariableSharedFunds,
    resolveFundColor,
    resolveFundIdForExpense,
    type FamilyFund,
} from "@/lib/funds";
import { resolveMovementIconColor } from "@/lib/movementIconColor";
import { isInvestmentAccountMovement } from "@/lib/accounts";
import PurchaseCompareSheet from "@/components/PurchaseCompareSheet";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useCategoriesStore } from "@/store/useCategoriesStore";
import { useFundsStore } from "@/store/useFundsStore";
import ProductTour from "@/components/ProductTour";
import { useProductTour } from "@/hooks/useProductTour";
import type { ProductTourStep } from "@/components/ProductTour";
import { isTourDone, TOUR_DONE_EVENT } from "@/lib/firstRun";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface HistoryExpenseRow {
    id: string;
    amount: number;
    concept: string;
    paid_by: string;
    responsible_for?: string | null;
    category?: string | null;
    category_id?: string | null;
    spend_segment?: string | null;
    split_type: ExpenseSplitType;
    expense_date: string;
    created_at: string;
    is_settled?: boolean;
    fund_id?: string | null;
    account_id?: string | null;
    paid_from_account?: boolean | null;
}

interface Filters {
    timeRange: "all" | "this_month" | "last_month" | "this_year";
    /** Empty = all. Values are fund uuids or "personal". */
    fundIds: string[];
    paidBy: "all" | "me" | "partner";
    status: "all" | "pending" | "settled";
    movementType: "all" | "deposits" | "expenses";
}

const DEFAULT_FILTERS: Filters = {
    timeRange: "this_month",
    fundIds: [],
    paidBy: "all",
    status: "all",
    movementType: "all",
};

type ViewMonth = { year: number; month: number };

function currentViewMonth(): ViewMonth {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
}

function shiftViewMonth(view: ViewMonth, delta: number): ViewMonth {
    const d = new Date(view.year, view.month + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
}

function isSameViewMonth(a: ViewMonth, b: ViewMonth) {
    return a.year === b.year && a.month === b.month;
}

function viewMonthFromTimeRange(timeRange: Filters["timeRange"]): ViewMonth {
    const now = currentViewMonth();
    if (timeRange === "last_month") return shiftViewMonth(now, -1);
    return now;
}

function historyMonthHeaderLabel(
    timeRange: Filters["timeRange"],
    viewMonth: ViewMonth
) {
    if (timeRange === "this_year") {
        return String(viewMonth.year);
    }
    if (timeRange === "all") {
        return "TODOS";
    }
    const d = new Date(viewMonth.year, viewMonth.month, 1);
    const monthName = new Intl.DateTimeFormat("es-ES", { month: "long" })
        .format(d)
        .toUpperCase();
    const now = currentViewMonth();
    if (viewMonth.year !== now.year) {
        return `${monthName} ${viewMonth.year}`;
    }
    return monthName;
}

function StickyDayLabel({
    label,
    scrollRoot,
}: {
    label: string;
    scrollRoot: HTMLElement | null;
}) {
    const sentinelRef = useRef<HTMLDivElement>(null);
    const [stuck, setStuck] = useState(false);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !scrollRoot) return;

        const observer = new IntersectionObserver(
            ([entry]) => setStuck(!entry.isIntersecting),
            { root: scrollRoot, threshold: 0 }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [scrollRoot, label]);

    return (
        <>
            <div ref={sentinelRef} className="h-px w-full" aria-hidden />
            <div
                className={`sticky top-0 z-10 py-1.5 transition-[background-color] duration-150 ${
                    stuck ? "-mx-4 bg-page-via px-5" : "bg-transparent px-1"
                }`}
            >
                <span className="text-[11px] font-medium tracking-wide text-on-surface">
                    {label}
                </span>
            </div>
        </>
    );
}

function groupByDate(expenses: HistoryExpenseRow[]): { label: string; items: HistoryExpenseRow[] }[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const map = new Map<string, { label: string; ts: number; items: HistoryExpenseRow[] }>();

    for (const e of expenses) {
        const raw = e.expense_date || e.created_at;
        const d = new Date(raw);
        const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map.has(dayKey)) {
            const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const diff = Math.round((today.getTime() - target.getTime()) / 86_400_000);
            let label: string;
            if (diff === 0) label = "Hoy";
            else if (diff === 1) label = "Ayer";
            else label = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" }).format(d).replace(".", "");
            map.set(dayKey, { label, ts: target.getTime(), items: [] });
        }
        map.get(dayKey)!.items.push(e);
    }
    return [...map.values()].sort((a, b) => b.ts - a.ts).map(({ label, items }) => ({ label, items }));
}

// ─── Component ────────────────────────────────────────────────────────────────
interface HistoryListProps {
    allExpenses: HistoryExpenseRow[];
    currentUserId: string;
    partnerName: string;
    partnerId: string | null;
    financialModel: string;
    initialFunds?: FamilyFund[];
}

export default function HistoryList({
    allExpenses: ssrExpenses,
    currentUserId,
    partnerName,
    partnerId,
    financialModel: ssrFinancialModel,
    initialFunds = [],
}: HistoryListProps) {
    const { format: formatCurrency } = useCurrency();
    const { setExpenseToEdit, setIsExpenseModalOpen } = useExpenseModal();
    const isHydrated = useExpenseStore((s) => s.isHydrated);
    const storeExpenses = useExpenseStore((s) => s.expenses);
    const storeFinancialModel = useExpenseStore((s) => s.financialModel);

    const historyTourSteps = useMemo<ProductTourStep[]>(
        () => [
            {
                target: "history-summary",
                title: "Vista rápida",
                body: "Resumen de tu bolsillo y, si van en pareja, el estado compartido o el balance entre ustedes.",
            },
            {
                target: "history-filters",
                title: "Filtros",
                body: "Acota por mes, bolsillo o quién pagó. Así encuentras un movimiento sin perderte.",
            },
        ],
        []
    );
    const historyTour = useProductTour(currentUserId, "history", historyTourSteps, {
        hasFamily: true,
    });

    const receiptTourSteps = useMemo<ProductTourStep[]>(
        () => [
            {
                target: "history-receipt",
                title: "Ticket escaneado",
                body: "Aquí puedes ver el detalle del recibo escaneado y comparar precios con compras anteriores.",
                placement: "bottom",
            },
        ],
        []
    );
    const receiptTour = useProductTour(
        currentUserId,
        "historyReceipt",
        receiptTourSteps,
        { hasFamily: true, autoStart: false }
    );

    // Prefer store when warm with data; never blank History if SSR still has rows.
    const preferStore =
        isHydrated && (storeExpenses.length > 0 || ssrExpenses.length === 0);
    const allExpenses = (preferStore ? storeExpenses : ssrExpenses) as HistoryExpenseRow[];
    const financialModel = preferStore ? storeFinancialModel : ssrFinancialModel;

    const [mounted, setMounted] = useState(false);
    const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null);
    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, startDeletingTransition] = useTransition();
    const [systemNotification, setSystemNotification] = useState<string | null>(null);
    const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
    const [receiptExpenseIds, setReceiptExpenseIds] = useState<Set<string>>(
        () => new Set()
    );
    const [receiptCompare, setReceiptCompare] =
        useState<PurchaseCompareResult | null>(null);
    const [receiptCompareOpen, setReceiptCompareOpen] = useState(false);
    const [receiptLoadingId, setReceiptLoadingId] = useState<string | null>(null);
    const storeFunds = useFundsStore((s) => s.funds);
    const loadFunds = useFundsStore((s) => s.load);
    const storeAccounts = useAccountsStore((s) => s.accounts);
    const loadAccounts = useAccountsStore((s) => s.load);
    const familyCategories = useCategoriesStore((s) => s.categories);
    const loadCategories = useCategoriesStore((s) => s.load);
    // Prefer store; fall back to SSR props so first paint has real fund colors.
    const funds = storeFunds.length > 0 ? storeFunds : initialFunds;

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (initialFunds.length) {
            useFundsStore.getState().setFunds(initialFunds);
        }
        void loadFunds();
    }, [initialFunds, loadFunds]);

    useEffect(() => {
        void loadAccounts();
    }, [loadAccounts]);

    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const ids = await listPurchaseReceiptExpenseIdsAction();
            if (cancelled) return;
            setReceiptExpenseIds(new Set(ids));
        })();
        return () => {
            cancelled = true;
        };
        // Re-check when the expense list changes (new grocery ticket after scan).
    }, [allExpenses.length]);

    async function openReceiptDetail(expenseId: string) {
        setReceiptLoadingId(expenseId);
        try {
            const result = await getPurchaseReceiptDetailForExpenseAction(expenseId);
            if (!result.ok) {
                setSystemNotification(result.error);
                window.setTimeout(() => setSystemNotification(null), 2800);
                return;
            }
            setReceiptCompare(result.compare);
            setReceiptCompareOpen(true);
            setActiveActionId(null);
        } finally {
            setReceiptLoadingId(null);
        }
    }

    // Filter states
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isFilterAnimated, setIsFilterAnimated] = useState(false);
    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [pendingFilters, setPendingFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [viewMonth, setViewMonth] = useState<ViewMonth>(currentViewMonth);

    const openFilterModal = () => {
        setPendingFilters({ ...filters });
        setIsFilterModalOpen(true);
        window.setTimeout(() => setIsFilterAnimated(true), 10);
    };
    const closeFilterModal = () => {
        setIsFilterAnimated(false);
        window.setTimeout(() => setIsFilterModalOpen(false), 300);
    };
    const applyFilters = () => {
        setFilters({ ...pendingFilters });
        if (
            pendingFilters.timeRange === "this_month" ||
            pendingFilters.timeRange === "last_month"
        ) {
            setViewMonth(viewMonthFromTimeRange(pendingFilters.timeRange));
        } else if (pendingFilters.timeRange === "this_year") {
            setViewMonth(currentViewMonth());
        }
        closeFilterModal();
    };
    const clearFilters = () => {
        setPendingFilters(DEFAULT_FILTERS);
        setFilters(DEFAULT_FILTERS);
        setViewMonth(currentViewMonth());
        closeFilterModal();
    };

    const canGoNextMonth =
        filters.timeRange === "all" ||
        filters.timeRange === "this_year" ||
        !isSameViewMonth(viewMonth, currentViewMonth());

    function goToPrevMonth() {
        if (filters.timeRange === "all" || filters.timeRange === "this_year") {
            setFilters((f) => ({ ...f, timeRange: "this_month" }));
            setViewMonth(shiftViewMonth(currentViewMonth(), -1));
            return;
        }
        setViewMonth((m) => shiftViewMonth(m, -1));
        setFilters((f) =>
            f.timeRange === "last_month" || f.timeRange === "this_month"
                ? { ...f, timeRange: "this_month" }
                : f
        );
    }

    function goToNextMonth() {
        if (filters.timeRange === "all") {
            setFilters((f) => ({ ...f, timeRange: "this_month" }));
            setViewMonth(currentViewMonth());
            return;
        }
        if (filters.timeRange === "this_year") {
            setFilters((f) => ({ ...f, timeRange: "this_month" }));
            setViewMonth(currentViewMonth());
            return;
        }
        if (!canGoNextMonth) return;
        setViewMonth((m) => {
            const next = shiftViewMonth(m, 1);
            const now = currentViewMonth();
            if (
                next.year > now.year ||
                (next.year === now.year && next.month > now.month)
            ) {
                return now;
            }
            return next;
        });
        setFilters((f) =>
            f.timeRange === "last_month" || f.timeRange === "this_month"
                ? { ...f, timeRange: "this_month" }
                : f
        );
    }

    const toggleAccordion = (label: string) => {
        setOpenAccordions((prev) => {
            const next = new Set(prev);
            if (next.has(label)) next.delete(label); else next.add(label);
            return next;
        });
    };

    const showToast = (message: string) => {
        setSystemNotification(message);
        window.setTimeout(() => setSystemNotification(null), 3000);
    };

    const openDeleteModal = (id: string) => { setExpenseToDelete(id); setIsDeleteModalOpen(true); };
    const closeDeleteModal = () => { setIsDeleteModalOpen(false); setExpenseToDelete(null); };
    const handleDeleteConfirm = () => {
        if (!expenseToDelete) return;
        startDeletingTransition(async () => {
            try {
                await deleteExpenseAction(expenseToDelete);
                closeDeleteModal();
                const { syncFamilyExpenses } = await import("@/lib/realtimeFamily");
                await syncFamilyExpenses();
            } catch (err) {
                closeDeleteModal();
                showToast(err instanceof Error ? err.message : "No se pudo eliminar el movimiento.");
            }
        });
    };

    // Couples only use shared/personal pockets (modelo de reparto removed).
    const isJointModel = true;
    const hasPartner = Boolean(partnerId);

    const effectiveFilters = useMemo(() => {
        if (!hasPartner) {
            return {
                ...filters,
                paidBy: "me" as const,
                status: "all" as const,
            };
        }

        return filters;
    }, [filters, hasPartner]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        // Default view is current calendar month — don't badge that as an extra filter.
        if (filters.timeRange === "all" || filters.timeRange === "this_year") {
            count += 1;
        } else if (
            filters.timeRange === "last_month" ||
            !isSameViewMonth(viewMonth, currentViewMonth())
        ) {
            count += 1;
        }
        if (filters.fundIds.length > 0) count += 1;
        if (filters.movementType !== "all") count += 1;
        if (hasPartner) {
            if (filters.paidBy !== "all") count += 1;
            if (filters.status !== "all") count += 1;
        } else if (filters.status !== "all") {
            // Solo: status forced off in effective, but still count if somehow set
            count += 0;
        }
        return count;
    }, [filters, hasPartner, viewMonth]);

    // Balance calculations (cash-flow)
    const myAvailableFund = useMemo(() => {
        const sharedFundIds = funds
            .filter((f) => f.scope === "shared" && !f.archived_at)
            .map((f) => f.id);
        return calculatePersonalPocketBalance(allExpenses, currentUserId, sharedFundIds);
    }, [allExpenses, currentUserId, funds]);

    const fundLiquidity = useMemo(() => {
        const fundRows = allExpenses.filter((e) => !e.account_id);
        const income = fundRows.filter((e) => e.category === "deposit" && e.responsible_for === "joint_fund").reduce((s, e) => s + Number(e.amount || 0), 0);
        const direct = fundRows.filter((e) => e.responsible_for === "joint_fund" && e.paid_by === "joint_fund" && e.category !== "deposit" && e.category !== "withdrawal").reduce((s, e) => s + Number(e.amount || 0), 0);
        const withdrawals = fundRows.filter((e) => e.category === "withdrawal" && e.responsible_for === "joint_fund").reduce((s, e) => s + Number(e.amount || 0), 0);
        return income - direct - withdrawals;
    }, [allExpenses]);

    const p2pBalance = useMemo(() => {
        const owesMe = allExpenses.filter((e) => e.paid_by === currentUserId && e.responsible_for !== currentUserId && e.responsible_for !== "joint_fund" && e.category !== "deposit" && !e.is_settled).reduce((s, e) => s + Number(e.amount || 0), 0);
        const iOwe = allExpenses.filter((e) => e.paid_by !== currentUserId && e.paid_by !== "joint_fund" && e.responsible_for === currentUserId && e.category !== "deposit" && !e.is_settled).reduce((s, e) => s + Number(e.amount || 0), 0);
        return owesMe - iOwe;
    }, [allExpenses, currentUserId]);

    // Filter pipeline
    const filteredExpenses = useMemo(() => {
        return allExpenses.filter((e) => {
            if (e.concept === "Reembolso del fondo" || isFundSettlementConcept(e.concept)) return false;
            // Investment ledger has its own history under Cuentas → Inversiones.
            if (isInvestmentAccountMovement(e, storeAccounts)) {
                return false;
            }
            // Fixed-expense real payments stay visible in history (no aportes for that pocket).
            if (effectiveFilters.timeRange !== "all") {
                const d = new Date(e.expense_date || e.created_at);
                if (
                    effectiveFilters.timeRange === "this_month" ||
                    effectiveFilters.timeRange === "last_month"
                ) {
                    if (
                        d.getMonth() !== viewMonth.month ||
                        d.getFullYear() !== viewMonth.year
                    ) {
                        return false;
                    }
                }
                if (
                    effectiveFilters.timeRange === "this_year" &&
                    d.getFullYear() !== viewMonth.year
                ) {
                    return false;
                }
            }
            if (effectiveFilters.fundIds.length > 0) {
                const resolvedFundId = resolveFundIdForExpense(e, funds, currentUserId);
                const personalFund = getPersonalFund(funds, currentUserId);
                const matchesSelected = effectiveFilters.fundIds.some((selectedId) => {
                    if (selectedId === "personal") {
                        if (personalFund) return resolvedFundId === personalFund.id;
                        const matched = resolvedFundId
                            ? funds.find((f) => f.id === resolvedFundId)
                            : null;
                        return !matched || matched.scope !== "shared";
                    }
                    return resolvedFundId === selectedId;
                });
                if (!matchesSelected) return false;
            }
            if (effectiveFilters.paidBy === "me" && e.paid_by !== currentUserId) return false;
            if (effectiveFilters.paidBy === "partner" && (e.paid_by === currentUserId || e.paid_by === "joint_fund")) return false;
            if (effectiveFilters.status === "pending" && e.is_settled) return false;
            if (effectiveFilters.status === "settled" && !e.is_settled) return false;
            if (effectiveFilters.movementType === "deposits" && e.category !== "deposit") return false;
            if (effectiveFilters.movementType === "expenses" && e.category === "deposit") return false;
            return true;
        });
    }, [allExpenses, effectiveFilters, currentUserId, funds, viewMonth, storeAccounts]);

    const groups = useMemo(() => groupByDate(filteredExpenses), [filteredExpenses]);

    const firstReceiptExpenseId = useMemo(
        () => filteredExpenses.find((e) => receiptExpenseIds.has(e.id))?.id ?? null,
        [filteredExpenses, receiptExpenseIds]
    );

    useEffect(() => {
        if (!currentUserId || !firstReceiptExpenseId) return;
        if (!isTourDone(currentUserId, "history")) return;
        receiptTour.start(700);
    }, [currentUserId, firstReceiptExpenseId, receiptTour.start]);

    useEffect(() => {
        if (!currentUserId || !firstReceiptExpenseId) return;
        const onTourDone = (event: Event) => {
            const detail = (event as CustomEvent<{ tourId?: string }>).detail;
            if (detail?.tourId === "history") {
                receiptTour.start(500);
            }
        };
        window.addEventListener(TOUR_DONE_EVENT, onTourDone);
        return () => window.removeEventListener(TOUR_DONE_EVENT, onTourDone);
    }, [currentUserId, firstReceiptExpenseId, receiptTour.start]);

    const sharedFunds = useMemo(
        () => listVariableSharedFunds(funds),
        [funds]
    );
    const personalFund = useMemo(
        () => getPersonalFund(funds, currentUserId),
        [funds, currentUserId]
    );

    const fundFilterOptions = useMemo(() => {
        const options: { v: string; l: string; color: string | null }[] = [];
        for (const fund of sharedFunds) {
            options.push({
                v: fund.id,
                l: fund.name,
                color: resolveFundColor(fund),
            });
        }
        options.push({
            v: personalFund?.id ?? "personal",
            l: "Mi bolsillo",
            color: personalFund ? resolveFundColor(personalFund) : DEFAULT_PERSONAL_FUND_COLOR,
        });
        return options;
    }, [sharedFunds, personalFund]);

    const toggleFundFilter = (fundId: string) => {
        setPendingFilters((prev) => {
            const selected = prev.fundIds.includes(fundId)
                ? prev.fundIds.filter((id) => id !== fundId)
                : [...prev.fundIds, fundId];
            return { ...prev, fundIds: selected };
        });
    };

    const renderExpenseCard = (expense: HistoryExpenseRow, index: number) => {
        const Icon = resolveExpenseCategoryIcon({
            category: expense.category,
            categoryId: expense.category_id,
            categories: familyCategories,
        });
        const isDeposit = expense.category === "deposit";
        const isWithdrawal = expense.category === "withdrawal";
        const isDebt = expense.paid_by !== expense.responsible_for && expense.category !== "deposit";
        const paidByMe = expense.paid_by === currentUserId;
        const paidByLabel = paidByMe ? "TÚ" : partnerName.toUpperCase().slice(0, 8);
        const isModifiable =
            (isDeposit || isWithdrawal || !expense.is_settled) &&
            expense.concept !== "Reembolso del fondo" &&
            !isFundSettlementConcept(expense.concept);
        const iconColor = resolveMovementIconColor(
            expense,
            funds,
            storeAccounts,
            currentUserId
        );
        const hasReceipt = receiptExpenseIds.has(expense.id);
        const receiptBusy = receiptLoadingId === expense.id;

        return (
            <div
                key={expense.id}
                className="group relative flex items-stretch overflow-hidden border-b border-glass-border last:border-0 bg-transparent animate-in slide-in-from-left-8 fade-in duration-500 fill-mode-both"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
                <button
                    type="button"
                    onClick={() => setActiveActionId((prev) => (prev === expense.id ? null : expense.id))}
                    className={`flex min-w-0 flex-1 items-center justify-between px-3 py-2 text-left transition-all duration-300 ease-out ${
                        activeActionId === expense.id ? "bg-glass-soft pr-2" : "bg-transparent"
                    }`}
                >
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div
                            className="icon-chip-fund flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
                            style={fundIconChipStyle(iconColor)}
                        >
                            <Icon size={14} strokeWidth={2} />
                        </div>
                        <div className="flex min-w-0 flex-col">
                            <span className="truncate text-[13px] font-medium text-on-surface">
                                {expense.concept}
                            </span>
                            <div className="mt-0.5 flex items-center gap-1.5">
                                <span className="text-[9px] font-medium uppercase tracking-wide text-outline-variant">
                                    {paidByLabel}
                                </span>
                                {isDebt && (
                                    <ExpenseDebtStatus isSettled={!!expense.is_settled} />
                                )}
                            </div>
                        </div>
                    </div>

                    <span
                        className={`shrink-0 text-sm font-medium ${
                            isDeposit ? "text-primary" : "text-on-surface"
                        }`}
                    >
                        {isDeposit ? "+" : "-"}
                        <FormattedCurrency value={Number(expense.amount)} />
                    </span>
                </button>

                {hasReceipt ? (
                    <button
                        type="button"
                        disabled={receiptBusy}
                        data-tour={
                            expense.id === firstReceiptExpenseId
                                ? "history-receipt"
                                : undefined
                        }
                        onClick={(e) => {
                            e.stopPropagation();
                            void openReceiptDetail(expense.id);
                        }}
                        className="flex w-9 shrink-0 items-center justify-center text-on-surface-variant/70 transition-colors hover:text-on-surface disabled:opacity-50"
                        aria-label="Ver detalle del ticket"
                        title="Ver detalle del ticket"
                    >
                        {receiptBusy ? (
                            <span className="h-3 w-3 animate-spin rounded-full border border-outline-variant/40 border-t-on-surface-variant" />
                        ) : (
                            <Ticket size={14} strokeWidth={1.5} />
                        )}
                    </button>
                ) : null}

                {/* Slide-out action panel */}
                <div className={`flex flex-col border-l border-outline-variant/20 transition-all duration-300 ease-out overflow-hidden shrink-0 ${activeActionId === expense.id ? "w-14 opacity-100" : "w-0 opacity-0 border-transparent"}`}>
                    {isModifiable ? (
                        <>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setExpenseToEdit({
                                        id: expense.id,
                                        amount: expense.amount,
                                        concept: expense.concept,
                                        category: expense.category,
                                        category_id: expense.category_id,
                                        spend_segment: expense.spend_segment,
                                        paid_by: expense.paid_by,
                                        responsible_for: expense.responsible_for,
                                        fund_id: expense.fund_id ?? null,
                                    });
                                    setIsExpenseModalOpen(true);
                                    setActiveActionId(null);
                                }}
                                className="flex-1 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 bg-surface-low/70 transition-colors border-b border-outline-variant/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteModal(expense.id);
                                    setActiveActionId(null);
                                }}
                                className="flex-1 flex items-center justify-center bg-error/15 text-error transition-colors hover:bg-error/25"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                showToast("🔒 Movimiento bloqueado. Este gasto ya fue liquidado o es un ajuste de sistema y no se puede modificar.");
                                setActiveActionId(null);
                            }}
                            className="flex-1 flex items-center justify-center text-outline-variant bg-surface-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                            title="Movimiento bloqueado"
                        >
                            <Lock size={16} />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const monthHeaderLabel = historyMonthHeaderLabel(
        isHydrated ? effectiveFilters.timeRange : "this_month",
        viewMonth
    );

    const monthNav = (
        <div className="flex items-center gap-0.5">
            <button
                type="button"
                onClick={goToPrevMonth}
                className="flex h-7 w-7 items-center justify-center rounded-full text-on-surface/55 transition-colors hover:bg-on-surface/[0.04] hover:text-on-surface"
                aria-label="Mes anterior"
            >
                <ChevronLeft size={16} strokeWidth={1.6} />
            </button>
            <span className="px-0.5 text-center text-[13px] font-light uppercase tracking-[0.14em] text-on-surface">
                {monthHeaderLabel}
            </span>
            <button
                type="button"
                onClick={goToNextMonth}
                disabled={!canGoNextMonth}
                className="flex h-7 w-7 items-center justify-center rounded-full text-on-surface/55 transition-colors hover:bg-on-surface/[0.04] hover:text-on-surface disabled:pointer-events-none disabled:opacity-30"
                aria-label="Mes siguiente"
            >
                <ChevronRight size={16} strokeWidth={1.6} />
            </button>
        </div>
    );

    // Show skeleton only when there are no SSR expenses and store hasn't hydrated yet
    if (!isHydrated && ssrExpenses.length === 0) {
        return (
            <>
                <PageHeader
                    title="Historial"
                    subtitle="Todos tus movimientos"
                    right={
                        <div className="flex items-center gap-0.5 opacity-50">
                            <span className="flex h-7 w-7" aria-hidden />
                            <span className="px-0.5 text-center text-[13px] font-light uppercase tracking-[0.14em] text-gray-400">
                                {monthHeaderLabel}
                            </span>
                            <span className="flex h-7 w-7" aria-hidden />
                        </div>
                    }
                    className="relative z-20 border-b-0 bg-transparent backdrop-blur-0 pt-[max(0,env(safe-area-inset-top))]"
                />
                <div className="flex-1 overflow-y-auto px-3 pb-[calc(var(--fab-clearance)+2rem)] pt-4">
                    {/* Balance chips skeleton */}
                    <div className="mb-4 flex gap-2">
                        <Skeleton className="h-14 flex-1 rounded-2xl" />
                        <Skeleton className="h-14 flex-1 rounded-2xl" />
                        <Skeleton className="h-14 w-14 rounded-2xl" />
                    </div>
                    {/* Row skeletons */}
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="mb-2 flex items-center gap-3 rounded-2xl bg-surface-lowest p-4 shadow-sm">
                            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-3 w-3/4 rounded" />
                                <Skeleton className="h-2 w-1/2 rounded" />
                            </div>
                            <Skeleton className="h-4 w-14 rounded" />
                        </div>
                    ))}
                </div>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title="Historial"
                subtitle="Todos tus movimientos"
                right={monthNav}
                className="relative z-20 border-b-0 bg-transparent backdrop-blur-0 pt-[max(0,env(safe-area-inset-top))]"
            />

            <div className="sticky top-0 z-40 px-4 pb-2 pt-1" data-tour="history-summary">
                <div className="flex items-center gap-2">
                    <div className="flex flex-1 overflow-hidden rounded-[1.25rem] border border-glass-border bg-glass-strong shadow-[var(--glass-shadow)] backdrop-blur-xl">
                        <div
                            className={`flex flex-1 flex-col items-center px-3 py-2.5 ${
                                hasPartner ? "border-r border-outline-variant/20" : ""
                            }`}
                        >
                            <span className="text-[10px] font-light text-on-surface-variant">
                                Mi bolsillo
                            </span>
                            <span
                                className={`text-[15px] font-light tracking-tight ${
                                    myAvailableFund >= 0 ? "text-on-surface" : "text-rose-600"
                                }`}
                            >
                                <FormattedCurrency value={myAvailableFund} />
                            </span>
                        </div>

                        {hasPartner ? (
                            isJointModel ? (
                                <div className="flex flex-1 flex-col items-center px-3 py-2.5">
                                    <span className="text-[10px] font-light text-on-surface-variant">
                                        Bolsillos
                                    </span>
                                    <span
                                        className={`text-[15px] font-light tracking-tight ${
                                            fundLiquidity >= 0 ? "text-on-surface" : "text-rose-600"
                                        }`}
                                    >
                                        <FormattedCurrency value={fundLiquidity} />
                                    </span>
                                </div>
                            ) : (
                                <div className="flex flex-1 flex-col items-center px-3 py-2.5">
                                    <span className="text-[10px] font-light text-on-surface-variant">
                                        Balance P2P
                                    </span>
                                    <span
                                        className={`text-[15px] font-light tracking-tight ${
                                            p2pBalance >= 0 ? "text-on-surface" : "text-rose-600"
                                        }`}
                                    >
                                        <FormattedCurrency value={p2pBalance} />
                                    </span>
                                </div>
                            )
                        ) : null}
                    </div>

                    <button
                        type="button"
                        data-tour="history-filters"
                        onClick={openFilterModal}
                        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
                            activeFilterCount > 0
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-outline-variant/30 bg-surface-lowest/80 text-on-surface-variant"
                        }`}
                    >
                        <SlidersHorizontal size={15} />
                        {activeFilterCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-on-surface text-[9px] font-bold text-surface-lowest">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <main ref={setScrollRoot} className="flex-1 overflow-y-auto px-4 pb-[calc(var(--fab-clearance)+2rem)]">
                {groups.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 pt-20 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-lowest/80 shadow-sm">
                            <Ticket size={22} className="text-outline-variant" />
                        </div>
                        <p className="text-sm font-medium text-on-surface-variant">
                            {activeFilterCount > 0
                                ? "Sin resultados para estos filtros."
                                : "Aún no hay movimientos registrados."}
                        </p>
                        {activeFilterCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setFilters(DEFAULT_FILTERS)}
                                className="rounded text-xs font-medium text-on-surface underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    groups.map(({ label, items }) => (
                        <section key={label} className="mb-2">
                            <StickyDayLabel label={label} scrollRoot={scrollRoot} />
                            <div className="overflow-hidden rounded-3xl border border-glass-border bg-glass shadow-[var(--glass-shadow)] backdrop-blur-md">
                                {items.map((expense, index) => renderExpenseCard(expense, index))}
                            </div>
                        </section>
                    ))
                )}
            </main>

            {mounted &&
                (isFilterModalOpen || isDeleteModalOpen) &&
                createPortal(
                    <>
                        {/* Filter Bottom Sheet */}
                        {isFilterModalOpen && (
                            <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                                <div
                                    className={`absolute inset-0 bg-on-surface/50 backdrop-blur-sm transition-opacity duration-300 ${
                                        isFilterAnimated ? "opacity-100" : "opacity-0"
                                    }`}
                                    onClick={closeFilterModal}
                                />
                                <div
                                    className={`relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[2rem] glass-sheet transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                        isFilterAnimated
                                            ? "translate-y-0 opacity-100"
                                            : "translate-y-full opacity-0"
                                    }`}
                                >
                                    <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-outline-variant/40" />

                                    <div className="relative flex shrink-0 items-center justify-center px-5 pb-2 pt-3">
                                        <h2 className="text-base font-medium tracking-tight text-on-surface">
                                            Filtros
                                        </h2>
                                        <button
                                            type="button"
                                            onClick={closeFilterModal}
                                            className="absolute right-4 top-2 flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/25 bg-glass-strong text-on-surface-variant shadow-sm backdrop-blur-sm transition-colors hover:bg-glass-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                                            aria-label="Cerrar"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-3">
                                        <div>
                                            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-outline-variant">
                                                Tipo
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {[
                                                    { v: "all", l: "Todos" },
                                                    { v: "expenses", l: "Gastos" },
                                                    { v: "deposits", l: "Aportes" },
                                                ].map(({ v, l }) => {
                                                    const isActive = pendingFilters.movementType === v;
                                                    return (
                                                        <button
                                                            key={v}
                                                            type="button"
                                                            onClick={() =>
                                                                setPendingFilters((f) => ({
                                                                    ...f,
                                                                    movementType: v as Filters["movementType"],
                                                                }))
                                                            }
                                                            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
                                                                isActive
                                                                    ? "border border-primary/25 bg-primary/15 text-primary shadow-sm"
                                                                    : "border border-outline-variant/20 bg-glass text-on-surface-variant shadow-sm hover:bg-glass-strong"
                                                            }`}
                                                        >
                                                            {l}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-outline-variant">
                                                Período
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {[
                                                    { v: "all", l: "Todo" },
                                                    { v: "this_month", l: "Este mes" },
                                                    { v: "last_month", l: "Mes pasado" },
                                                    { v: "this_year", l: "Este año" },
                                                ].map(({ v, l }) => {
                                                    const isActive = pendingFilters.timeRange === v;
                                                    return (
                                                        <button
                                                            key={v}
                                                            type="button"
                                                            onClick={() =>
                                                                setPendingFilters((f) => ({
                                                                    ...f,
                                                                    timeRange: v as Filters["timeRange"],
                                                                }))
                                                            }
                                                            className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
                                                                isActive
                                                                    ? "border border-primary/25 bg-primary/15 text-primary shadow-sm"
                                                                    : "border border-outline-variant/20 bg-glass text-on-surface-variant shadow-sm hover:bg-glass-strong"
                                                            }`}
                                                        >
                                                            {l}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-outline-variant">
                                                Bolsillo
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setPendingFilters((f) => ({
                                                            ...f,
                                                            fundIds: [],
                                                        }))
                                                    }
                                                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
                                                        pendingFilters.fundIds.length === 0
                                                            ? "border border-primary/25 bg-primary/15 text-primary shadow-sm"
                                                            : "border border-outline-variant/20 bg-glass text-on-surface-variant shadow-sm hover:bg-glass-strong"
                                                    }`}
                                                >
                                                    Todos
                                                </button>
                                                {fundFilterOptions.map(({ v, l, color }) => {
                                                    const isActive = pendingFilters.fundIds.includes(v);
                                                    return (
                                                        <button
                                                            key={v}
                                                            type="button"
                                                            onClick={() => toggleFundFilter(v)}
                                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
                                                                isActive
                                                                    ? "border border-transparent text-white shadow-sm"
                                                                    : "border border-outline-variant/20 bg-glass text-on-surface-variant shadow-sm hover:bg-glass-strong"
                                                            }`}
                                                            style={
                                                                isActive && color
                                                                    ? { backgroundColor: color }
                                                                    : undefined
                                                            }
                                                        >
                                                            {color && !isActive ? (
                                                                <span
                                                                    className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10"
                                                                    style={{ backgroundColor: color }}
                                                                    aria-hidden
                                                                />
                                                            ) : null}
                                                            {color && isActive ? (
                                                                <span
                                                                    className="h-2 w-2 shrink-0 rounded-full bg-glass-strong ring-1 ring-glass-border"
                                                                    aria-hidden
                                                                />
                                                            ) : null}
                                                            {l}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {pendingFilters.fundIds.length > 0 ? (
                                                <p className="mt-1.5 text-[10px] text-on-surface-variant">
                                                    {pendingFilters.fundIds.length} seleccionado
                                                    {pendingFilters.fundIds.length === 1 ? "" : "s"}
                                                </p>
                                            ) : null}
                                        </div>

                                        {hasPartner ? (
                                            <div>
                                                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-outline-variant">
                                                    Pagado por
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {[
                                                        { v: "all", l: "Cualquiera" },
                                                        { v: "me", l: "Yo" },
                                                        { v: "partner", l: partnerName },
                                                    ].map(({ v, l }) => {
                                                        const isActive = pendingFilters.paidBy === v;
                                                        return (
                                                            <button
                                                                key={v}
                                                                type="button"
                                                                onClick={() =>
                                                                    setPendingFilters((f) => ({
                                                                        ...f,
                                                                        paidBy: v as Filters["paidBy"],
                                                                    }))
                                                                }
                                                                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
                                                                    isActive
                                                                        ? "border border-primary/25 bg-primary/15 text-primary shadow-sm"
                                                                        : "border border-outline-variant/20 bg-glass text-on-surface-variant shadow-sm hover:bg-glass-strong"
                                                                }`}
                                                            >
                                                                {l}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}

                                        {hasPartner ? (
                                            <div>
                                                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-outline-variant">
                                                    Estado
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {[
                                                        { v: "all", l: "Todos" },
                                                        { v: "pending", l: "Pendiente" },
                                                        { v: "settled", l: "Liquidado" },
                                                    ].map(({ v, l }) => {
                                                        const isActive = pendingFilters.status === v;
                                                        return (
                                                            <button
                                                                key={v}
                                                                type="button"
                                                                onClick={() =>
                                                                    setPendingFilters((f) => ({
                                                                        ...f,
                                                                        status: v as Filters["status"],
                                                                    }))
                                                                }
                                                                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
                                                                    isActive
                                                                        ? "border border-primary/25 bg-primary/15 text-primary shadow-sm"
                                                                        : "border border-outline-variant/20 bg-glass text-on-surface-variant shadow-sm hover:bg-glass-strong"
                                                                }`}
                                                            >
                                                                {l}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="flex shrink-0 gap-2.5 px-5 pb-6 pt-2">
                                        <button
                                            type="button"
                                            onClick={clearFilters}
                                            className="flex-1 rounded-2xl border border-outline-variant/20 bg-glass-strong py-2.5 text-sm font-semibold text-on-surface-variant shadow-sm transition-colors hover:bg-glass-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                                        >
                                            Limpiar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={applyFilters}
                                            className="flex-1 rounded-2xl bg-primary py-2.5 text-sm font-semibold text-on-primary shadow-[0_10px_24px_rgba(43,52,55,0.16)] transition-colors hover:brightness-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                                        >
                                            Aplicar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Toast */}
                        {systemNotification && (
                            <div className="fixed top-6 left-1/2 z-[110] -translate-x-1/2 animate-in fade-in slide-in-from-top-3 duration-300">
                                <div className="rounded-2xl bg-on-surface/95 px-5 py-3 text-sm font-medium text-on-primary shadow-xl backdrop-blur-sm">
                                    {systemNotification}
                                </div>
                            </div>
                        )}

                        {/* Delete modal */}
                        {isDeleteModalOpen && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-on-surface/60 backdrop-blur-sm" onClick={closeDeleteModal} />
                                <div className="glass-modal relative z-[1] w-full max-w-xs rounded-3xl p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                                    <div className="modal-danger-icon mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                                        <Trash2 size={24} />
                                    </div>
                                    <h3 className="mb-1 text-base font-bold text-on-surface">Eliminar Movimiento</h3>
                                    <p className="mb-6 text-sm text-on-surface-variant">
                                        ¿Estás seguro? Esta acción no se puede deshacer y ajustará los saldos.
                                    </p>
                                    <div className="flex gap-3">
                                        <button type="button" onClick={closeDeleteModal} disabled={isDeleting}
                                            className="flex-1 rounded-xl bg-surface-low py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50">
                                            Cancelar
                                        </button>
                                        <button type="button" onClick={handleDeleteConfirm} disabled={isDeleting}
                                            className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-70">
                                            {isDeleting ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                    </svg>
                                                    Eliminando...
                                                </span>
                                            ) : "Sí, Eliminar"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>,
                    document.body
                )}

            <ProductTour
                open={historyTour.open}
                steps={historyTour.steps}
                onClose={historyTour.close}
            />
            <ProductTour
                open={receiptTour.open}
                steps={receiptTour.steps}
                onClose={receiptTour.close}
            />

            <PurchaseCompareSheet
                open={receiptCompareOpen}
                compare={receiptCompare}
                formatMoney={formatCurrency}
                title="Detalle del ticket"
                onClose={() => setReceiptCompareOpen(false)}
            />
        </>
    );
}
