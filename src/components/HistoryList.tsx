"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { deleteExpenseAction } from "@/app/actions/expenses";
import { getCategoryDetails } from "@/lib/categoryMap";
import type { ExpenseSplitType } from "@/lib/expenses";

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
}

interface Filters {
    timeRange: "all" | "this_month" | "last_month" | "this_year";
    fundTarget: "all" | "personal" | "joint_fund";
    paidBy: "all" | "me" | "partner";
    status: "all" | "pending" | "settled";
}

function formatDate(dateInput: string) {
    return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" })
        .format(new Date(dateInput))
        .replace(".", "");
}

function formatCurrency(value: number) {
    return `$${Math.abs(value).toFixed(2)}`;
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

export default function HistoryList({ allExpenses, currentUserId, partnerName, financialModel }: HistoryListProps) {
    const router = useRouter();
    const { setExpenseToEdit, setIsExpenseModalOpen } = useExpenseModal();

    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, startDeletingTransition] = useTransition();
    const [systemNotification, setSystemNotification] = useState<string | null>(null);
    const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());

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
            try { await deleteExpenseAction(expenseToDelete); closeDeleteModal(); router.refresh(); }
            catch { closeDeleteModal(); }
        });
    };

    const isJointModel = financialModel === "joint_fund";
    const activeFilterCount = Object.values(filters).filter((v) => v !== "all").length;

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
            if (e.concept === "Reembolso del fondo" || e.concept === "Liquidación de deuda") return false;
            if (filters.timeRange !== "all") {
                const d = new Date(e.expense_date || e.created_at);
                if (filters.timeRange === "this_month" && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
                if (filters.timeRange === "last_month") { const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); if (d.getMonth() !== lm.getMonth() || d.getFullYear() !== lm.getFullYear()) return false; }
                if (filters.timeRange === "this_year" && d.getFullYear() !== now.getFullYear()) return false;
            }
            if (filters.fundTarget === "personal" && e.responsible_for === "joint_fund") return false;
            if (filters.fundTarget === "joint_fund" && e.responsible_for !== "joint_fund") return false;
            if (filters.paidBy === "me" && e.paid_by !== currentUserId) return false;
            if (filters.paidBy === "partner" && (e.paid_by === currentUserId || e.paid_by === "joint_fund")) return false;
            if (filters.status === "pending" && e.is_settled) return false;
            if (filters.status === "settled" && !e.is_settled) return false;
            return true;
        });
    }, [allExpenses, filters, currentUserId]);

    const groups = useMemo(() => groupByDate(filteredExpenses), [filteredExpenses]);

    const renderExpenseCard = (expense: HistoryExpenseRow) => {
        const { icon: Icon } = getCategoryDetails(expense.category ?? "");
        const isDeposit = expense.category === "deposit";
        const isDebt = expense.paid_by !== expense.responsible_for && expense.category !== "deposit";
        const paidByMe = expense.paid_by === currentUserId;
        const paidByLabel = paidByMe ? "TÚ" : partnerName.toUpperCase().slice(0, 8);
        const isModifiable =
            (!expense.is_settled || expense.category === 'deposit') &&
            expense.concept !== 'Reembolso del fondo' &&
            expense.concept !== 'Liquidación de deuda';

        return (
            <div
                key={expense.id}
                className="relative flex items-stretch border-b border-slate-50 last:border-0 bg-white overflow-hidden"
            >
                {/* Main row button */}
                <button
                    type="button"
                    onClick={() => setActiveActionId((prev) => prev === expense.id ? null : expense.id)}
                    className={`flex items-center justify-between px-4 py-3.5 transition-all duration-300 ease-out w-full text-left ${activeActionId === expense.id ? "bg-slate-50 pr-2" : "bg-white"}`}
                >
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-emerald-800/10 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0 shadow-sm">
                            <Icon size={18} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 leading-tight">{expense.concept}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                                    {formatDate(expense.expense_date || expense.created_at)} • {paidByLabel}
                                </span>
                                {isDebt && (
                                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${expense.is_settled
                                        ? "bg-emerald-50 text-emerald-600"
                                        : "bg-orange-50 text-orange-600"
                                        }`}>
                                        {expense.is_settled ? "Liquidado" : "Pendiente"}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <span className={`text-base font-medium shrink-0 ${isDeposit ? "text-[#60855c]" : "text-slate-800"}`}>
                        {isDeposit ? "+" : "-"}${Number(expense.amount).toFixed(2)}
                    </span>
                </button>

                {/* Slide-out action panel */}
                <div className={`flex flex-col border-l border-slate-100 transition-all duration-300 ease-out overflow-hidden shrink-0 ${activeActionId === expense.id ? "w-14 opacity-100" : "w-0 opacity-0 border-transparent"}`}>
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
                                className="flex-1 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 bg-slate-50/50 transition-colors border-b border-slate-100"
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
                            className="flex-1 flex items-center justify-center text-slate-400 bg-slate-100 transition-colors"
                            title="Movimiento bloqueado"
                        >
                            <Lock size={16} />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Balance chips header */}
            <div className="sticky top-0 z-40 backdrop-blur-md bg-slate-50/90 px-4 py-3 border-b border-slate-100">
                <div className="flex items-center">

                    {/* Contenedor Unificado de Saldos */}
                    <div className="flex-1 flex overflow-hidden rounded-2xl shadow-sm border border-slate-200/60">

                        {/* Mi Fondo chip (Mitad Izquierda) */}
                        <div className="relative flex-1 flex flex-col items-center bg-indigo-50 px-3 py-2 border-r border-slate-200/50">
                            <div className="absolute inset-0 z-0 opacity-15 mix-blend-multiply pointer-events-none bg-[url('/waves3.svg')] bg-cover bg-center" />
                            <div className="relative z-10 flex flex-col items-center">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-700">Mi Fondo</span>
                                <span className={`text-sm font-bold ${myAvailableFund >= 0 ? "text-indigo-700" : "text-rose-600"}`}>
                                    {formatCurrency(myAvailableFund)}
                                </span>
                            </div>
                        </div>

                        {/* Dynamic chip (Mitad Derecha) */}
                        {isJointModel ? (
                            <div className="relative flex-1 flex flex-col items-center bg-[#60855c]/10 px-3 py-2">
                                <div className="absolute inset-0 z-0 opacity-15 mix-blend-multiply pointer-events-none bg-[url('/waves3.svg')] bg-cover bg-center" />
                                <div className="relative z-10 flex flex-col items-center">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#60855c]">Fondo Común</span>
                                    <span className={`text-sm font-bold ${fundLiquidity >= 0 ? "text-[#60855c]" : "text-rose-600"}`}>
                                        {formatCurrency(fundLiquidity)}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="relative flex-1 flex flex-col items-center bg-[#60855c]/10 px-3 py-2">
                                <div className="absolute inset-0 z-0 opacity-15 mix-blend-multiply pointer-events-none bg-[url('/waves3.svg')] bg-cover bg-center" />
                                <div className="relative z-10 flex flex-col items-center">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#60855c]">Balance P2P</span>
                                    <span className={`text-sm font-bold ${p2pBalance >= 0 ? "text-[#60855c]" : "text-rose-600"}`}>
                                        {formatCurrency(p2pBalance)}
                                    </span>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Filter button (Se mantiene intacto y separado) */}
                    <button
                        type="button"
                        onClick={openFilterModal}
                        className="relative h-8 w-8 ml-2 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600/50 shrink-0 shadow-sm"
                    >
                        <SlidersHorizontal size={16} />
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold text-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Main list */}
            <main className="flex-1 overflow-y-auto pb-32">
                {groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center pt-20">
                        <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
                            <ReceiptText size={24} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-500">
                            {activeFilterCount > 0 ? "Sin resultados para estos filtros." : "Aún no hay movimientos registrados."}
                        </p>
                        {activeFilterCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setFilters({ timeRange: "all", fundTarget: "all", paidBy: "all", status: "all" })}
                                className="text-xs font-semibold text-slate-600 underline underline-offset-2"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    groups.map(({ label, items }) => (
                        <section key={label}>
                            <div className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm px-4 py-2 border-b border-slate-100">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
                            </div>
                            <div className="bg-white divide-y divide-slate-50 shadow-sm mx-3 my-2 rounded-2xl overflow-hidden">
                                {items.map((expense) => renderExpenseCard(expense))}
                            </div>
                        </section>
                    ))
                )}
            </main>

            {/* Filter Bottom Sheet */}
            {isFilterModalOpen && (
                <div className="fixed inset-0 z-100 flex items-end justify-center">
                    <div
                        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isFilterAnimated ? "opacity-100" : "opacity-0"}`}
                        onClick={closeFilterModal}
                    />
                    <div className={`relative w-full max-w-lg rounded-t-3xl bg-white px-5 pt-4 pb-8 shadow-2xl transition-transform duration-300 ease-out ${isFilterAnimated ? "translate-y-0" : "translate-y-full"}`}>
                        {/* Handle */}
                        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-bold text-slate-800">Filtros</h2>
                            <button type="button" onClick={closeFilterModal} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-5 overflow-y-auto max-h-96">
                            {/* Período */}
                            <div>
                                <p className="text-xs font-normal uppercase tracking-widest text-slate-400 mb-2">Período</p>
                                <div className="ml-1 flex flex-wrap gap-2">
                                    {[{ v: "all", l: "Todo" }, { v: "this_month", l: "Este mes" }, { v: "last_month", l: "Mes pasado" }, { v: "this_year", l: "Este año" }].map(({ v, l }) => (
                                        <button key={v} type="button"
                                            onClick={() => setPendingFilters((f) => ({ ...f, timeRange: v as Filters["timeRange"] }))}
                                            className={`px-3 py-1.5 rounded-full text-xs transition-colors ${pendingFilters.timeRange === v ? "bg-[#5b8156a9] text-white font-bold shadow-md ring-2 ring-[#60855c]/20 ring-offset-1" : "bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                                        >{l}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Bolsillo destino */}
                            <div>
                                <p className="text-xs font-normal uppercase tracking-widest text-slate-400 mb-2">Bolsillo</p>
                                <div className="ml-1 flex flex-wrap gap-2">
                                    {[{ v: "all", l: "Todos" }, { v: "personal", l: "Personal" }, { v: "joint_fund", l: "Fondo Común" }].map(({ v, l }) => (
                                        <button key={v} type="button"
                                            onClick={() => setPendingFilters((f) => ({ ...f, fundTarget: v as Filters["fundTarget"] }))}
                                            className={`px-3 py-1.5 rounded-full text-xs transition-colors ${pendingFilters.fundTarget === v ? "bg-[#5b8156a9] text-white font-bold shadow-md ring-2 ring-[#60855c]/20 ring-offset-1" : "bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                                        >{l}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Pagado por */}
                            <div>
                                <p className="text-xs font-normal uppercase tracking-widest text-slate-400 mb-2">Pagado por</p>
                                <div className="ml-1 flex flex-wrap gap-2">
                                    {[{ v: "all", l: "Cualquiera" }, { v: "me", l: "Yo" }, { v: "partner", l: partnerName }].map(({ v, l }) => (
                                        <button key={v} type="button"
                                            onClick={() => setPendingFilters((f) => ({ ...f, paidBy: v as Filters["paidBy"] }))}
                                            className={`px-3 py-1.5 rounded-full text-xs transition-colors ${pendingFilters.paidBy === v ? "bg-[#5b8156a9] text-white font-bold shadow-md ring-2 ring-[#60855c]/20 ring-offset-1" : "bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                                        >{l}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Estado */}
                            <div>
                                <p className="text-xs font-normal uppercase tracking-widest text-slate-400 mb-2">Estado</p>
                                <div className="ml-1 mb-1 flex flex-wrap gap-2">
                                    {[{ v: "all", l: "Todos" }, { v: "pending", l: "Pendiente" }, { v: "settled", l: "Liquidado" }].map(({ v, l }) => (
                                        <button key={v} type="button"
                                            onClick={() => setPendingFilters((f) => ({ ...f, status: v as Filters["status"] }))}
                                            className={`px-3 py-1.5 rounded-full text-xs transition-colors ${pendingFilters.status === v ? "bg-[#5b8156a9] text-white font-bold shadow-md ring-2 ring-[#60855c]/20 ring-offset-1" : "bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                                        >{l}</button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={clearFilters} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">
                                Limpiar
                            </button>
                            <button type="button" onClick={applyFilters} className="flex-1 rounded-xl bg-[#4b6948e0] py-3 text-sm font-semibold text-white hover:bg-slate-900 transition-colors">
                                Aplicar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {systemNotification && (
                <div className="fixed top-6 left-1/2 z-200 -translate-x-1/2 animate-in slide-in-from-top-3 fade-in duration-300">
                    <div className="rounded-2xl bg-slate-800/95 px-5 py-3 text-sm font-medium text-white shadow-xl backdrop-blur-sm">
                        {systemNotification}
                    </div>
                </div>
            )}

            {/* Delete modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={closeDeleteModal} />
                    <div className="relative w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 fade-in duration-200">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50">
                            <Trash2 size={24} className="text-rose-500" />
                        </div>
                        <h3 className="mb-1 text-base font-bold text-slate-800">Eliminar Movimiento</h3>
                        <p className="mb-6 text-sm text-slate-500">
                            ¿Estás seguro? Esta acción no se puede deshacer y ajustará los saldos.
                        </p>
                        <div className="flex gap-3">
                            <button type="button" onClick={closeDeleteModal} disabled={isDeleting}
                                className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50">
                                Cancelar
                            </button>
                            <button type="button" onClick={handleDeleteConfirm} disabled={isDeleting}
                                className="flex-1 rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-600 disabled:opacity-70">
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
