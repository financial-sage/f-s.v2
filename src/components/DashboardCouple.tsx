"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
    Home,
    ReceiptText,
    Settings,
    ShoppingCart,
    UtensilsCrossed,
    Wrench,
    type LucideIcon,
} from "lucide-react";
import LiquidateButton from "@/components/LiquidateButton";
import type { DashboardMember } from "@/lib/dashboard";
import type { ExpenseSplitType } from "@/lib/expenses";

type CoupleExpenseIconKey = "shopping-cart" | "coffee" | "car" | "utensils" | "receipt";

interface CoupleDashboardExpense {
    id: string;
    concept: string;
    amount: number;
    paid_by: string;
    paidBy?: string;
    split_type: ExpenseSplitType;
    splitType?: ExpenseSplitType;
    expense_date: string;
    created_at: string;
    profiles:
        | {
            full_name: string | null;
            avatar_url: string | null;
        }
        | null;
    payerName?: string;
    full_name?: string | null;
}

type ActivityFilter = "compartido" | "mio" | "suyo";

interface DashboardCoupleProps {
    familyId: string;
    currentUserId: string;
    familyName: string;
    currentUserName: string;
    members: DashboardMember[];
    expenses: CoupleDashboardExpense[];
    mySpent: number;
    partnerSpent: number;
    debt: {
        deudorId: string | null;
        acreedorId: string | null;
        monto: number;
    };
}

const iconMap: Record<CoupleExpenseIconKey, LucideIcon> = {
    "shopping-cart": ShoppingCart,
    coffee: ReceiptText,
    car: ReceiptText,
    utensils: UtensilsCrossed,
    receipt: Wrench,
};

function getInitials(name: string) {
    return (
        name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? "")
            .join("") || "FS"
    );
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
    }).format(value);
}

function formatExpenseDate(dateInput: string) {
    const date = new Date(dateInput);

    return new Intl.DateTimeFormat("es-MX", {
        day: "numeric",
        month: "short",
    })
        .format(date)
        .replace(".", "");
}

function getExpenseIconKey(concept: string): CoupleExpenseIconKey {
    const normalized = concept.toLowerCase();

    if (/super|market|compra|grocery/.test(normalized)) return "shopping-cart";
    if (/cafe|café|coffee/.test(normalized)) return "coffee";
    if (/gas|gasolina|uber|taxi|auto|car/.test(normalized)) return "car";
    if (/comida|rest|restaurant|almuerzo|cena/.test(normalized)) return "utensils";

    return "receipt";
}

export default function DashboardCouple({
    familyId,
    currentUserId,
    familyName,
    currentUserName,
    members,
    expenses,
    mySpent,
    partnerSpent,
    debt,
}: DashboardCoupleProps) {
    const [activeFilter, setActiveFilter] = useState<ActivityFilter>("compartido");
    const partner = members.find((member) => member.id !== currentUserId) ?? null;
    const partnerName = partner?.name ?? "Tu pareja";
    const { deudorId, acreedorId, monto } = debt;

    const debtTitle =
        monto === 0
            ? "Están al día ✨"
            : currentUserId === acreedorId
                ? `${partnerName} te debe ${formatCurrency(monto)}`
                : currentUserId === deudorId
                    ? `Debes ${formatCurrency(monto)} a ${partnerName}`
                    : `${formatCurrency(monto)} pendientes`;

    const totalSpent = Math.max(mySpent + partnerSpent, 1);
    const myPercent = Math.max(8, Math.min(100, Math.round((mySpent / totalSpent) * 100)));
    const partnerPercent = Math.max(
        8,
        Math.min(100, Math.round((partnerSpent / totalSpent) * 100))
    );

    console.log("Data cruda recibida en cliente:", expenses);

    const filteredExpenses = useMemo(() => {
        return expenses.filter((expense) => {
            const currentSplitType = expense.split_type || expense.splitType || "";
            const currentPaidBy = expense.paid_by || expense.paidBy || "";

            if (activeFilter === "compartido") {
                return currentSplitType.includes("shared");
            }

            if (activeFilter === "mio") {
                return currentPaidBy === currentUserId && !currentSplitType.includes("shared");
            }

            if (activeFilter === "suyo") {
                return currentPaidBy !== currentUserId && !currentSplitType.includes("shared");
            }

            return true;
        });
    }, [activeFilter, currentUserId, expenses]);

    return (
        <>
            <header className="fixed top-0 z-50 flex w-full items-center justify-between bg-[#F8F9FA]/80 px-6 py-4 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-primary/20">
                        {members[0]?.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className="h-full w-full object-cover" src={members[0].avatarUrl} alt={members[0].name} />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-primary-container text-sm font-bold text-on-primary-container">
                                {getInitials(currentUserName)}
                            </div>
                        )}
                    </div>
                    <span className="text-lg font-bold text-[#2B3437] font-headline">Financial Sage</span>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/profile" className="text-[#2B3437]/60 transition-opacity hover:opacity-80">
                        <Settings size={22} />
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-md px-4 pt-24 pb-32">
                <section className="mb-6 px-2">
                    <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">{familyName}</h1>
                    <p className="text-sm font-medium opacity-70 text-on-surface-variant font-label">
                        Santuario compartido • Hoy
                    </p>
                </section>

                <section className="mb-6">
                    <div className="relative overflow-hidden rounded-lg bg-[#60855c] p-5 shadow-sm">
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <img className="w-full h-full object-cover"
                                data-alt="smooth abstract flowing waves with subtle grain texture and soft organic shapes in light green tones"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDW6rtFa_USq8iJFAxck_vUy7fkvL4vFeNGyLjrw4v_0WmYOmtnLD2okKywR76zx-eW0TBSh0MNnzkEQPI-H1xkOB7yt-A_4D9MHNQ0s6AO7u1f2FDR757IUOe8R5QevfkwpH4LLueHmrnZvx45CaUVa51P5VAXReh-yqj0anDccMrhZNGmqh0ufqpqHtvYQHLM2ydLKfluKZhX3MXMF8g_5DUHgnJAdWxUlx-fiXWlGrNl-LxlbLSzxXSP-qgVWogOyXXuigyn49L3" />
                        </div>
                        <div className="relative flex flex-col gap-4">
                            <div>
                                <span className="text-xs font-bold text-on-primary/70 uppercase tracking-widest opacity-80 font-label">
                                    Saldo de Pareja
                                </span>
                                <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-white/80">{debtTitle}</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                {monto > 0 ? (
                                    <LiquidateButton
                                        familyId={familyId}
                                        deudorId={deudorId}
                                        acreedorId={acreedorId}
                                        monto={monto}
                                    />
                                ) : (
                                    <button className="rounded-full bg-surface-container-lowest px-5 py-2.5 text-xs font-bold text-primary shadow-sm font-label">
                                        Liquidado
                                    </button>
                                )}
                                <Link
                                    href="/history"
                                    className="rounded-full border border-on-primary/20 bg-on-primary/10 px-5 py-2.5 text-xs font-bold text-on-primary font-label"
                                >
                                    Ver Detalles
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-8">
                    <div className="mb-4 flex justify-between items-end px-2">
                        <h3 className="text-lg font-bold tracking-tight text-on-surface">Resumen Semanal</h3>
                        <span className="text-xs font-bold uppercase tracking-widest text-primary font-label">Este mes</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-surface-container-low p-4">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-label">
                                Tus gastos
                            </p>
                            <p className="text-xl font-extrabold text-on-surface">{formatCurrency(mySpent)}</p>
                            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-primary/20">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${myPercent}%` }} />
                            </div>
                        </div>
                        <div className="rounded-lg bg-surface-container-low p-4">
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-label">
                                Gastos de {partnerName}
                            </p>
                            <p className="text-xl font-extrabold text-on-surface">{formatCurrency(partnerSpent)}</p>
                            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-tertiary/20">
                                <div className="h-full rounded-full bg-tertiary" style={{ width: `${partnerPercent}%` }} />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-8">
                    <div className="flex gap-1 rounded-full bg-surface-low p-1.5">
                        <button
                            type="button"
                            onClick={() => setActiveFilter("compartido")}
                            className={`flex-1 rounded-full py-2 text-xs font-bold transition-all font-label ${activeFilter === "compartido"
                                ? "bg-slate-100 text-[#2B3437] shadow-sm"
                                : "text-on-surface-variant hover:bg-surface-container-high/50"
                                }`}
                        >
                            Compartido
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveFilter("mio")}
                            className={`flex-1 rounded-full py-2 text-xs font-bold transition-all font-label ${activeFilter === "mio"
                                ? "bg-slate-100 text-[#2B3437] shadow-sm"
                                : "text-on-surface-variant hover:bg-surface-container-high/50"
                                }`}
                        >
                            Mío
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveFilter("suyo")}
                            className={`flex-1 rounded-full py-2 text-xs font-bold transition-all font-label ${activeFilter === "suyo"
                                ? "bg-slate-100 text-[#2B3437] shadow-sm"
                                : "text-on-surface-variant hover:bg-surface-container-high/50"
                                }`}
                        >
                            Suyo
                        </button>
                    </div>
                </section>

                <section>
                    <div className="mb-5 flex items-center justify-between px-2">
                        <h3 className="text-lg font-bold tracking-tight text-on-surface">Actividad Compartida</h3>
                        <Link
                            href="/history"
                            className="text-xs font-bold uppercase tracking-widest text-primary transition-opacity hover:opacity-80 font-label"
                        >
                            Ver todo
                        </Link>
                    </div>
                    <div className="flex flex-col gap-3">
                        {filteredExpenses.length === 0 ? (
                            <div className="flex items-center justify-between rounded-lg bg-surface-container-lowest p-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high">
                                        <Home size={20} className="text-on-surface-variant" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-on-surface">Aún no hay gastos</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 font-label">
                                            Cambia el filtro o agrega un nuevo movimiento
                                        </span>
                                    </div>
                                </div>
                                <span className="text-sm font-extrabold text-on-surface">{formatCurrency(0)}</span>
                            </div>
                        ) : (
                            filteredExpenses.map((expense) => {
                                const Icon = iconMap[getExpenseIconKey(expense.concept)] ?? ReceiptText;
                                const payerName =
                                    expense.profiles?.full_name ||
                                    expense.payerName ||
                                    expense.full_name ||
                                    "Alguien";
                                const actorAvatar = expense.profiles?.avatar_url ?? null;
                                const actorInitials = getInitials(payerName);

                                return (
                                    <div
                                        key={expense.id}
                                        className="group flex items-center justify-between rounded-lg bg-surface-container-lowest p-4 transition-colors duration-200 hover:bg-surface-container-low"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high">
                                                <Icon size={20} className="text-on-surface-variant" />
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-surface-container-low bg-primary-container text-[10px] font-bold text-primary">
                                                        {actorAvatar ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img className="h-full w-full object-cover" src={actorAvatar} alt={payerName} />
                                                        ) : (
                                                            actorInitials
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-bold text-on-surface">{expense.concept}</span>
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60 font-label">
                                                    {formatExpenseDate(expense.expense_date || expense.created_at)} • {payerName}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-sm font-extrabold text-on-surface">-{formatCurrency(expense.amount)}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </main>
        </>
    );
}
