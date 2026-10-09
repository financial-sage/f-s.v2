"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
    getDefaultSharedFund,
    isSharedLegacyResponsible,
    resolveFundColor,
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
    fundTarget: "all" | "personal" | "joint_fund";
    paidBy: "all" | "me" | "partner";
    status: "all" | "pending" | "settled";
}

function formatCurrency(value: number) {
    const rounded = Math.round((Number(value) || 0) * 100) / 100;
    const normalized = Object.is(rounded, -0) || Math.abs(rounded) < 0.005 ? 0 : rounded;
    const sign = normalized < 0 ? "-" : "";
    return `${sign}$${Math.abs(normalized).toFixed(2)}`;
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
    const store = useExpenseStore();

    // Use store data when hydrated (instant on navigation), fall back to SSR props
    const allExpenses = (store.isHydrated ? store.expenses : ssrExpenses) as HistoryExpenseRow[];
    const financialModel = store.isHydrated ? store.financialModel : ssrFinancialModel;

    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, startDeletingTransition] = useTransition();
    const [systemNotification, setSystemNotification] = useState<string | null>(null);
    const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
    const [funds, setFunds] = useState<FamilyFund[]>([]);

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
    const [filters, setFilters] = useState<Filters>({ timeRange: "all", fundTarget: "all", paidBy: "all", status: "all" });
    const [pendingFilters, setPendingFilters] = useState<Filters>({ timeRange: "all", fundTarget: "all", paidBy: "all", status: "all" });

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
        const reset: Filters = { timeRange: "all", fundTarget: "all", paidBy: "all", status: "all" };
        setPendingFilters(reset); setFilters(reset); closeFilterModal();
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
            try { await deleteExpenseAction(expenseToDelete); closeDeleteModal(); await store.refreshData(); }
            catch { closeDeleteModal(); }
        });
    };

    const isJointModel = financialModel === "joint_fund";
    const hasPartner = Boolean(partnerId);

    const effectiveFilters = useMemo(() => {
        if (!hasPartner) {
            return {
                ...filters,
                fundTarget: "personal" as const,
                paidBy: "me" as const,
                status: "all" as const,
            };
        }

        return filters;
    }, [filters, hasPartner]);

    const activeFilterCount = useMemo(() => {
        if (!hasPartner) {
            // In solo mode, some filters are forced for correctness but not selectable by the user.
            return [filters.timeRange, filters.status].filter((v) => v !== "all").length;
        }

        return Object.values(filters).filter((v) => v !== "all").length;
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
            if (effectiveFilters.fundTarget === "personal" && e.responsible_for === "joint_fund") return false;
            if (effectiveFilters.fundTarget === "joint_fund" && e.responsible_for !== "joint_fund") return false;
            if (effectiveFilters.paidBy === "me" && e.paid_by !== currentUserId) return false;
            if (effectiveFilters.paidBy === "partner" && (e.paid_by === currentUserId || e.paid_by === "joint_fund")) return false;
            if (effectiveFilters.status === "pending" && e.is_settled) return false;
            if (effectiveFilters.status === "settled" && !e.is_settled) return false;
            return true;
        });
    }, [allExpenses, effectiveFilters, currentUserId]);

    const groups = useMemo(() => groupByDate(filteredExpenses), [filteredExpenses]);

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
        const debtFund =
            funds.find((f) => f.id === expense.fund_id) ??
            (isSharedLegacyResponsible(expense.responsible_for)
                ? getDefaultSharedFund(funds)
                : null);

        return (
            <div
                key={expense.id}
                className="group relative flex items-stretch overflow-hidden border-b border-outline-variant/15 last:border-0 bg-surface-lowest animate-in slide-in-from-left-8 fade-in duration-500 fill-mode-both"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
                <button
                    type="button"
                    onClick={() => setActiveActionId((prev) => (prev === expense.id ? null : expense.id))}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left transition-all duration-300 ease-out ${
                        activeActionId === expense.id ? "bg-surface pr-2" : "bg-surface-lowest"
                    }`}
                >
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant/20 bg-emerald-800/10 text-on-surface-variant shadow-sm">
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
                                    <ExpenseDebtStatus
                                        isSettled={!!expense.is_settled}
                                        fundColor={debtFund ? resolveFundColor(debtFund) : null}
                                        fundName={debtFund?.name}
                                    />
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
    if (!store.isHydrated && ssrExpenses.length === 0) {
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

            <main className="flex-1 overflow-y-auto px-4 pb-32">
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
                                onClick={() =>
                                    setFilters({
                                        timeRange: "all",
                                        fundTarget: "all",
                                        paidBy: "all",
                                        status: "all",
                                    })
                                }
                                className="rounded text-xs font-medium text-on-surface underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    groups.map(({ label, items }) => (
                        <section key={label} className="mb-2">
                            <div className="sticky top-0 z-10 px-1 py-1">
                                <span className="text-[11px] font-medium tracking-wide text-on-surface">
                                    {label}
                                </span>
                            </div>
                            <div className="overflow-hidden rounded-3xl border border-outline-variant/15 bg-surface-lowest/75 shadow-[0_10px_24px_rgba(43,52,55,0.05)] backdrop-blur-md">
                                {items.map((expense, index) => renderExpenseCard(expense, index))}
                            </div>
                        </section>
                    ))
                )}
            </main>

            {/* Filter Bottom Sheet */}
            {isFilterModalOpen && (
                <div className="fixed inset-0 z-100 flex items-end justify-center">
                    <div
                        className={`absolute inset-0 bg-on-surface/60 backdrop-blur-sm transition-opacity duration-300 ${isFilterAnimated ? "opacity-100" : "opacity-0"}`}
                        onClick={closeFilterModal}
                    />
                    <div className={`relative w-full max-w-lg rounded-t-3xl bg-surface-lowest px-5 pt-4 pb-8 shadow-2xl transition-transform duration-300 ease-out ${isFilterAnimated ? "translate-y-0" : "translate-y-full"}`}>
                        {/* Handle */}
                        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-container" />
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-bold text-on-surface">Filtros</h2>
                            <button type="button" onClick={closeFilterModal} className="text-outline-variant hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 rounded-full p-1">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5 overflow-y-auto max-h-96">
                            {/* Período */}
                            <div>
                                <p className="text-xs font-normal uppercase tracking-widest text-outline-variant mb-2">Período</p>
                                <div className="ml-1 flex flex-wrap gap-2">
                                    {[{ v: "all", l: "Todo" }, { v: "this_month", l: "Este mes" }, { v: "last_month", l: "Mes pasado" }, { v: "this_year", l: "Este año" }].map(({ v, l }) => (
                                        <button key={v} type="button"
                                            onClick={() => setPendingFilters((f) => ({ ...f, timeRange: v as Filters["timeRange"] }))}
                                            className={`px-3 py-1.5 rounded-full text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${pendingFilters.timeRange === v ? "bg-primary/70 text-on-primary font-bold shadow-md ring-2 ring-primary/20 ring-offset-1" : "bg-surface-low border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"}`}
                                        >{l}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Bolsillo destino */}
                            <div>
                                <p className="text-xs font-normal uppercase tracking-widest text-outline-variant mb-2">Bolsillo</p>
                                <div className="ml-1 flex flex-wrap gap-2">
                                    {[
                                        { v: "all", l: "Todos" },
                                        { v: "personal", l: hasPartner ? "Personal" : "Mi fondo" },
                                        ...(hasPartner ? [{ v: "joint_fund", l: "Fondo Común" }] : []),
                                    ].map(({ v, l }) => (
                                        <button key={v} type="button"
                                            onClick={() => setPendingFilters((f) => ({ ...f, fundTarget: v as Filters["fundTarget"] }))}
                                            className={`px-3 py-1.5 rounded-full text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${pendingFilters.fundTarget === v ? "bg-primary/70 text-on-primary font-bold shadow-md ring-2 ring-primary/20 ring-offset-1" : "bg-surface-low border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"}`}
                                        >{l}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Pagado por */}
                            {hasPartner ? (
                                <div>
                                    <p className="text-xs font-normal uppercase tracking-widest text-outline-variant mb-2">Pagado por</p>
                                    <div className="ml-1 flex flex-wrap gap-2">
                                        {[{ v: "all", l: "Cualquiera" }, { v: "me", l: "Yo" }, { v: "partner", l: partnerName }].map(({ v, l }) => (
                                            <button key={v} type="button"
                                                onClick={() => setPendingFilters((f) => ({ ...f, paidBy: v as Filters["paidBy"] }))}
                                                className={`px-3 py-1.5 rounded-full text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${pendingFilters.paidBy === v ? "bg-primary/70 text-on-primary font-bold shadow-md ring-2 ring-primary/20 ring-offset-1" : "bg-surface-low border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"}`}
                                            >{l}</button>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {/* Estado */}
                            <div>
                                <p className="text-xs font-normal uppercase tracking-widest text-outline-variant mb-2">Estado</p>
                                <div className="ml-1 mb-1 flex flex-wrap gap-2">
                                    {[{ v: "all", l: "Todos" }, { v: "pending", l: "Pendiente" }, { v: "settled", l: "Liquidado" }].map(({ v, l }) => (
                                        <button key={v} type="button"
                                            onClick={() => setPendingFilters((f) => ({ ...f, status: v as Filters["status"] }))}
                                            className={`px-3 py-1.5 rounded-full text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${pendingFilters.status === v ? "bg-primary/70 text-on-primary font-bold shadow-md ring-2 ring-primary/20 ring-offset-1" : "bg-surface-low border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"}`}
                                        >{l}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={clearFilters} className="flex-1 rounded-xl bg-surface-low py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25">
                                Limpiar
                            </button>
                            <button type="button" onClick={applyFilters} className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-on-primary hover:brightness-[1.02] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25">
                                Aplicar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {systemNotification && (
                <div className="fixed top-6 left-1/2 z-200 -translate-x-1/2 animate-in slide-in-from-top-3 fade-in duration-300">
                    <div className="rounded-2xl bg-on-surface/95 px-5 py-3 text-sm font-medium text-on-primary shadow-xl backdrop-blur-sm">
                        {systemNotification}
                    </div>
                </div>
            )}

            {/* Delete modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-on-surface/60 backdrop-blur-sm" onClick={closeDeleteModal} />
                    <div className="relative w-full max-w-xs rounded-3xl bg-surface-lowest p-6 text-center shadow-2xl animate-in zoom-in-95 fade-in duration-200">
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
        </>
    );
}
