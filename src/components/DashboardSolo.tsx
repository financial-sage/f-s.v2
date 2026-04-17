"use client";

import Link from "next/link";
import { useState } from "react";
import {
    Bolt,
    CarFront,
    Coffee,
    Edit,
    ReceiptText,
    Settings,
    ShoppingBag,
    Trash2,
    type LucideIcon,
} from "lucide-react";
import { useExpenseModal } from "@/components/ExpenseModalProvider";
import type { DashboardBudget, DashboardTransaction } from "@/lib/dashboard";

interface DashboardSoloProps {
    userName: string;
    avatarUrl?: string | null;
    budget: DashboardBudget;
    transactions: DashboardTransaction[];
}

const iconMap: Record<DashboardTransaction["iconKey"], LucideIcon> = {
    "shopping-cart": ShoppingBag,
    coffee: Coffee,
    car: CarFront,
    utensils: ReceiptText,
    receipt: Bolt,
};

function getInitial(name: string) {
    return name.trim().charAt(0).toUpperCase() || "T";
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
    }).format(value);
}

export default function DashboardSolo({
    userName,
    avatarUrl,
    budget,
    transactions,
}: DashboardSoloProps) {
    const { setExpenseToEdit, setIsExpenseModalOpen } = useExpenseModal();
    const displayName = userName?.trim() || "Tomás García";
    const displayBalance = budget.available;
    const percent = budget.budget > 0 ? Math.min(100, Math.round((budget.spent / budget.budget) * 100)) : 0;
    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const currentList = transactions.slice(0, 5);

    return (
        <>
            <header className="fixed top-0 z-50 flex w-full items-center justify-between bg-[#F8F9FA]/80 px-6 py-4 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-primary/20 bg-surface-container">
                        {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt={displayName} className="h-full w-full object-cover" src={avatarUrl} />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-primary-container text-sm font-bold text-on-primary-container">
                                {getInitial(displayName)}
                            </div>
                        )}
                    </div>

                    <div>
                        <span className="block text-base font-bold tracking-tight text-[#2B3437]">
                            {displayName}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                            Dashboard personal
                        </span>
                    </div>
                </div>

                <Link href="/profile" className="text-[#2B3437]/60 transition-opacity hover:opacity-80">
                    <Settings size={22} />
                </Link>
            </header>

            <main className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden px-4 pt-20 pb-24">
                <section className="mb-4 px-2">
                    <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">Tu tablero</h1>
                </section>

                <section className="shrink-0 mb-4">
                    <div className="relative mb-3 overflow-hidden rounded-3xl bg-[#60855c] p-6 text-white shadow-md">
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <img
                                className="h-full w-full object-cover"
                                data-alt="smooth abstract flowing waves with subtle grain texture and soft organic shapes in light green tones"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDW6rtFa_USq8iJFAxck_vUy7fkvL4vFeNGyLjrw4v_0WmYOmtnLD2okKywR76zx-eW0TBSh0MNnzkEQPI-H1xkOB7yt-A_4D9MHNQ0s6AO7u1f2FDR757IUOe8R5QevfkwpH4LLueHmrnZvx45CaUVa51P5VAXReh-yqj0anDccMrhZNGmqh0ufqpqHtvYQHLM2ydLKfluKZhX3MXMF8g_5DUHgnJAdWxUlx-fiXWlGrNl-LxlbLSzxXSP-qgVWogOyXXuigyn49L3"
                            />
                        </div>
                        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

                        <div className="relative z-10">
                            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/70">
                                Saldo disponible
                            </span>
                            <h2 className="mb-5 text-4xl font-bold">{formatCurrency(displayBalance)}</h2>

                            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                                <div className="mb-2 flex items-end justify-between gap-3">
                                    <div>
                                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-white/70">
                                            Presupuesto Mensual
                                        </span>
                                        <span className="text-sm font-semibold text-white/90">{budget.monthLabel}</span>
                                    </div>
                                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white">
                                        {percent}%
                                    </span>
                                </div>

                                <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                                    <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
                                </div>

                                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                                    <div>
                                        <span className="block uppercase tracking-wide text-white/60">Gastado</span>
                                        <span className="font-bold text-white">{formatCurrency(budget.spent)}</span>
                                    </div>
                                    <div>
                                        <span className="block uppercase tracking-wide text-white/60">Meta</span>
                                        <span className="font-bold text-white">{formatCurrency(budget.budget)}</span>
                                    </div>
                                    <div>
                                        <span className="block uppercase tracking-wide text-white/60">Libre</span>
                                        <span className="font-bold text-white">{formatCurrency(budget.available)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </section>

                <div className="flex-1 flex flex-col min-h-0 mb-24 px-2">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="block text-[12px] font-bold uppercase tracking-wide text-slate-500">Actividad Personal</h3>
                        <Link href="/history" className="text-xs font-bold uppercase tracking-widest text-primary transition-opacity hover:opacity-80 font-label">
                            Ver todo
                        </Link>
                    </div>

                    <div className="flex-1 bg-white rounded-3xl shadow-sm flex flex-col overflow-hidden">
                        {currentList.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full animate-in fade-in duration-1000">
                                <div className="relative mb-5 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full bg-[#60855c] opacity-10 animate-ping duration-1000" />
                                    <div className="absolute inset-0 rounded-full bg-[#60855c] opacity-20 animate-pulse" />

                                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-emerald-100/50 bg-emerald-50 text-[#60855c] shadow-sm">
                                        <ReceiptText size={36} strokeWidth={1.5} />
                                    </div>
                                </div>

                                <h4 className="mb-2 text-lg font-bold text-slate-700">Todo está tranquilo</h4>
                                <p className="max-w-55 text-xs leading-relaxed text-slate-400">
                                    Aún no hay movimientos aquí. Usa el botón verde para registrar tu primer gasto.
                                </p>
                            </div>
                        ) : (
                            <div className="flex h-full flex-col">
                                {currentList.map((tx) => {
                                    const Icon = iconMap[tx.iconKey] ?? ReceiptText;

                                    return (
                                        <div
                                            key={tx.id}
                                            className={`relative flex items-stretch border-b border-slate-50 last:border-0 bg-white overflow-hidden group ${
                                                currentList.length >= 5 ? 'flex-1' : ''
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setActiveActionId((prev) => (prev === tx.id ? null : tx.id))}
                                                className={`flex items-center justify-between px-4 transition-all duration-300 ease-out w-full text-left ${
                                                    currentList.length >= 5 ? 'h-full' : 'py-4'
                                                } ${
                                                    activeActionId === tx.id ? 'scale-[1] bg-slate-50 pr-2 inset-shadow-zinc-700' : 'scale-100 bg-white'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-800/10 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0 shadow-sm">
                                                        <Icon size={18} />
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-800">{tx.concept}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                                                                {tx.tag} • {tx.dateLabel}
                                                            </span>
                                                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${
                                                                tx.isShared ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                                                            }`}>
                                                                {tx.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <span className="text-base font-bold shrink-0 text-slate-800">
                                                    -{formatCurrency(tx.amount)}
                                                </span>
                                            </button>

                                            <div
                                                className={`flex flex-col border-l border-slate-100 transition-all duration-300 ease-out overflow-hidden shrink-0 ${
                                                    activeActionId === tx.id ? 'w-14 opacity-100' : 'w-0 opacity-0 border-transparent'
                                                }`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setExpenseToEdit({
                                                            id: tx.id,
                                                            amount: tx.amount,
                                                            concept: tx.concept,
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
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                    }}
                                                    className="flex-1 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 bg-rose-50/30 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}
