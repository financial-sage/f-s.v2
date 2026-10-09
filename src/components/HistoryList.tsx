"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useExpenseStore } from "@/store/useExpenseStore";
import {
    ChevronDown,
    Edit,
    Lock,
    Receipt,
    ReceiptText,
    SlidersHorizontal,
    Trash2,
    X,
} from "lucide-react";
import { useExpenseModal } from "@/components/ExpenseModalProvider";
import {
    ExpenseDebtStatus,
    isFundSettlementConcept,
} from "@/components/ExpenseDebtStatus";
import { deleteExpenseAction } from "@/app/actions/expenses";
import { listFamilyFundsAction } from "@/app/actions/funds";
import { getCategoryDetails } from "@/lib/categoryMap";
import type { ExpenseSplitType } from "@/lib/expenses";
import {
    DEFAULT_PERSONAL_FUND_COLOR,
    getPersonalFund,
    resolveFundColor,
    resolveFundIdForExpense,
    type FamilyFund,
} from "@/lib/funds";
import { Skeleton } from "@/components/ui/Skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface HistoryExpenseRow {
    id: string;
    amount: number;
    concept: string;
    paid_by: string;
    responsible_for?: string | null;
    category?: string | null;
    split_type: ExpenseSplitType;
    expense_date: string;
    created_at: string;
    is_settled?: boolean;
    fund_id?: string | null;
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
    timeRange: "all",
    fundIds: [],
    paidBy: "all",
    status: "all",
    movementType: "all",
};

function formatCurrency(value: number) {
    const rounded = Math.round((Number(value) || 0) * 100) / 100;
    const normalized = Object.is(rounded, -0) || Math.abs(rounded) < 0.005 ? 0 : rounded;
    const sign = normalized < 0 ? "-" : "";
    return `${sign}$${Math.abs(normalized).toFixed(2)}`;
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
                    stuck ? "-mx-4 bg-[#e8ede4] px-5" : "bg-transparent px-1"
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
}

export default function HistoryList({ allExpenses: ssrExpenses, currentUserId, partnerName, partnerId, financialModel: ssrFinancialModel }: HistoryListProps) {
    const router = useRouter();
    const { setExpenseToEdit, setIsExpenseModalOpen } = useExpenseModal();
    const isHydrated = useExpenseStore((s) => s.isHydrated);
    const storeExpenses = useExpenseStore((s) => s.expenses);
    const storeFinancialModel = useExpenseStore((s) => s.financialModel);
    const refreshData = useExpenseStore((s) => s.refreshData);

    // Use store data when hydrated (instant on navigation), fall back to SSR props
    const allExpenses = (isHydrated ? storeExpenses : ssrExpenses) as HistoryExpenseRow[];
    const financialModel = isHydrated ? storeFinancialModel : ssrFinancialModel;

    const [mounted, setMounted] = useState(false);
    const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null);
    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, startDeletingTransition] = useTransition();
    const [systemNotification, setSystemNotification] = useState<string | null>(null);
    const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
    const [funds, setFunds] = useState<FamilyFund[]>([]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const rows = await listFamilyFundsAction();
                if (!cancelled) setFunds(rows.filter((f) => !f.archived_at));
            } catch {
                // Funds optional for history badges
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Filter states
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isFilterAnimated, setIsFilterAnimated] = useState(false);
    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [pendingFilters, setPendingFilters] = useState<Filters>(DEFAULT_FILTERS);

    const openFilterModal = () => {
        setPendingFilters({ ...filters });
        setIsFilterModalOpen(true);
        window.setTimeout(() => setIsFilterAnimated(true), 10);
    };
    const closeFilterModal = () => {
        setIsFilterAnimated(false);
        window.setTimeout(() => setIsFilterModalOpen(false), 300);
    };
    const applyFilters = () => { setFilters({ ...pendingFilters }); closeFilterModal(); };
    const clearFilters = () => {
        setPendingFilters(DEFAULT_FILTERS);
        setFilters(DEFAULT_FILTERS);
        closeFilterModal();
    };

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
            try { await deleteExpenseAction(expenseToDelete); closeDeleteModal(); await refreshData(); }
            catch { closeDeleteModal(); }
        });
    };

    const isJointModel = financialModel === "joint_fund";
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
        if (filters.timeRange !== "all") count += 1;
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
    }, [filters, hasPartner]);

    // Balance calculations (cash-flow)
    const myAvailableFund = useMemo(() => {
        const income = allExpenses.filter((e) => e.category === "deposit" && (e.responsible_for === currentUserId || e.responsible_for === "mio")).reduce((s, e) => s + Number(e.amount || 0), 0);
        const out = allExpenses.filter((e) => e.paid_by === currentUserId && e.category !== "deposit" && e.category !== "withdrawal").reduce((s, e) => s + Number(e.amount || 0), 0);
        return income - out;
    }, [allExpenses, currentUserId]);

    const fundLiquidity = useMemo(() => {
        const income = allExpenses.filter((e) => e.category === "deposit" && e.responsible_for === "joint_fund").reduce((s, e) => s + Number(e.amount || 0), 0);
        const direct = allExpenses.filter((e) => e.responsible_for === "joint_fund" && e.paid_by === "joint_fund" && e.category !== "deposit" && e.category !== "withdrawal").reduce((s, e) => s + Number(e.amount || 0), 0);
        const withdrawals = allExpenses.filter((e) => e.category === "withdrawal" && e.responsible_for === "joint_fund").reduce((s, e) => s + Number(e.amount || 0), 0);
        return income - direct - withdrawals;
    }, [allExpenses]);

    const p2pBalance = useMemo(() => {
        const owesMe = allExpenses.filter((e) => e.paid_by === currentUserId && e.responsible_for !== currentUserId && e.responsible_for !== "joint_fund" && e.category !== "deposit" && !e.is_settled).reduce((s, e) => s + Number(e.amount || 0), 0);
        const iOwe = allExpenses.filter((e) => e.paid_by !== currentUserId && e.paid_by !== "joint_fund" && e.responsible_for === currentUserId && e.category !== "deposit" && !e.is_settled).reduce((s, e) => s + Number(e.amount || 0), 0);
        return owesMe - iOwe;
    }, [allExpenses, currentUserId]);

    // Filter pipeline
    const filteredExpenses = useMemo(() => {
        const now = new Date();
        return allExpenses.filter((e) => {
            if (e.concept === "Reembolso del fondo" || isFundSettlementConcept(e.concept)) return false;
            if (effectiveFilters.timeRange !== "all") {
                const d = new Date(e.expense_date || e.created_at);
                if (effectiveFilters.timeRange === "this_month" && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
                if (effectiveFilters.timeRange === "last_month") { const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); if (d.getMonth() !== lm.getMonth() || d.getFullYear() !== lm.getFullYear()) return false; }
                if (effectiveFilters.timeRange === "this_year" && d.getFullYear() !== now.getFullYear()) return false;
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
    }, [allExpenses, effectiveFilters, currentUserId, funds]);

    const groups = useMemo(() => groupByDate(filteredExpenses), [filteredExpenses]);

    const sharedFunds = useMemo(
        () => funds.filter((f) => f.scope === "shared").sort((a, b) => a.sort_order - b.sort_order),
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
            l: "Mi fondo",
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
        const { icon: Icon } = getCategoryDetails(expense.category ?? "");
        const isDeposit = expense.category === "deposit";
        const isDebt = expense.paid_by !== expense.responsible_for && expense.category !== "deposit";
        const paidByMe = expense.paid_by === currentUserId;
        const paidByLabel = paidByMe ? "TÚ" : partnerName.toUpperCase().slice(0, 8);
        const isModifiable =
            (!expense.is_settled || expense.category === 'deposit') &&
            expense.concept !== 'Reembolso del fondo' &&
            !isFundSettlementConcept(expense.concept);
        const expenseFundId = resolveFundIdForExpense(expense, funds, currentUserId);
        const expenseFund = expenseFundId
            ? funds.find((f) => f.id === expenseFundId) ?? null
            : null;
        const iconColor = expenseFund
            ? resolveFundColor(expenseFund)
            : DEFAULT_PERSONAL_FUND_COLOR;

        return (
            <div
                key={expense.id}
                className="group relative flex items-stretch overflow-hidden border-b border-white/40 last:border-0 bg-transparent animate-in slide-in-from-left-8 fade-in duration-500 fill-mode-both"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
                <button
                    type="button"
                    onClick={() => setActiveActionId((prev) => (prev === expense.id ? null : expense.id))}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left transition-all duration-300 ease-out ${
                        activeActionId === expense.id ? "bg-white/40 pr-2" : "bg-transparent"
                    }`}
                >
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm"
                            style={{
                                backgroundColor: `${iconColor}18`,
                                borderColor: `${iconColor}35`,
                                color: iconColor,
                            }}
                            title={expenseFund?.name ?? "Mi fondo"}
                        >
                            <Icon size={14} />
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
                        {isDeposit ? "+" : "-"}${Number(expense.amount).toFixed(2)}
                    </span>
                </button>

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
                                        paid_by: expense.paid_by,
                                        responsible_for: expense.responsible_for,
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
                                className="flex-1 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 bg-rose-50/30 transition-colors"
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

    // Show skeleton only when there are no SSR expenses and store hasn't hydrated yet
    if (!isHydrated && ssrExpenses.length === 0) {
        return (
            <div className="flex-1 overflow-y-auto pb-32 px-3 pt-4">
                {/* Balance chips skeleton */}
                <div className="flex gap-2 mb-4">
                    <Skeleton className="flex-1 h-14 rounded-2xl" />
                    <Skeleton className="flex-1 h-14 rounded-2xl" />
                    <Skeleton className="h-14 w-14 rounded-2xl" />
                </div>
                {/* Row skeletons */}
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 bg-surface-lowest rounded-2xl p-4 mb-2 shadow-sm">
                        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-3 w-3/4 rounded" />
                            <Skeleton className="h-2 w-1/2 rounded" />
                        </div>
                        <Skeleton className="h-4 w-14 rounded" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <>
            <div className="sticky top-0 z-40 px-4 pb-2 pt-1">
                <div className="flex items-center gap-2">
                    <div className="flex flex-1 overflow-hidden rounded-[1.25rem] border border-white/60 bg-surface-lowest/70 shadow-[0_10px_24px_rgba(43,52,55,0.06)] backdrop-blur-xl">
                        <div
                            className={`flex flex-1 flex-col items-center px-3 py-2.5 ${
                                hasPartner ? "border-r border-outline-variant/20" : ""
                            }`}
                        >
                            <span className="text-[10px] font-light text-on-surface-variant">
                                Mi fondo
                            </span>
                            <span
                                className={`text-[15px] font-light tracking-tight ${
                                    myAvailableFund >= 0 ? "text-on-surface" : "text-rose-600"
                                }`}
                            >
                                {formatCurrency(myAvailableFund)}
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
                                        {formatCurrency(fundLiquidity)}
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
                                        {formatCurrency(p2pBalance)}
                                    </span>
                                </div>
                            )
                        ) : null}
                    </div>

                    <button
                        type="button"
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

            <main ref={setScrollRoot} className="flex-1 overflow-y-auto px-4 pb-32">
                {groups.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 pt-20 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-lowest/80 shadow-sm">
                            <ReceiptText size={22} className="text-outline-variant" />
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
                            <div className="overflow-hidden rounded-3xl border border-white/60 bg-surface-lowest/45 shadow-[0_10px_24px_rgba(43,52,55,0.06)] backdrop-blur-2xl">
                                {items.map((expense, index) => renderExpenseCard(expense, index))}
                            </div>
                        </section>
                    ))
                )}
            </main>

            {mounted &&
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
                                    className={`relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-linear-to-b from-[#f7f8f5] to-[#eef1eb] shadow-[0_-16px_48px_rgba(43,52,55,0.18)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
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
                                            className="absolute right-4 top-2 flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/25 bg-white/70 text-on-surface-variant shadow-sm backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
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
                                                                    : "border border-outline-variant/20 bg-white/55 text-on-surface-variant shadow-sm hover:bg-white/80"
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
                                                                    : "border border-outline-variant/20 bg-white/55 text-on-surface-variant shadow-sm hover:bg-white/80"
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
                                                            : "border border-outline-variant/20 bg-white/55 text-on-surface-variant shadow-sm hover:bg-white/80"
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
                                                                    : "border border-outline-variant/20 bg-white/55 text-on-surface-variant shadow-sm hover:bg-white/80"
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
                                                                    className="h-2 w-2 shrink-0 rounded-full bg-white/90 ring-1 ring-white/40"
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
                                                                        : "border border-outline-variant/20 bg-white/55 text-on-surface-variant shadow-sm hover:bg-white/80"
                                                                }`}
                                                            >
                                                                {l}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}

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
                                                                    : "border border-outline-variant/20 bg-white/55 text-on-surface-variant shadow-sm hover:bg-white/80"
                                                            }`}
                                                        >
                                                            {l}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex shrink-0 gap-2.5 px-5 pb-6 pt-2">
                                        <button
                                            type="button"
                                            onClick={clearFilters}
                                            className="flex-1 rounded-2xl border border-outline-variant/20 bg-white/70 py-2.5 text-sm font-semibold text-on-surface-variant shadow-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
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
                                <div className="relative z-[1] w-full max-w-xs rounded-3xl bg-surface-lowest p-6 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50">
                                        <Trash2 size={24} className="text-rose-500" />
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
                                            className="flex-1 rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-70">
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
        </>
    );
}
