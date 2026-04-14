"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    CarFront,
    ChevronDown,
    Home,
    Plus,
    ReceiptText,
    Settings,
    ShoppingCart,
    House,
    User,
    UtensilsCrossed,
    Wrench,
    X,
    type LucideIcon,
} from "lucide-react";
import { settleDebt } from "@/app/actions/debt";
import { createDeposit } from "@/app/actions/expenses";
import { settleFundDebtAction } from "@/app/actions/settleFundDebt";
import AddExpenseForm from "@/components/AddExpenseForm";
import CustomNumpad from "@/components/CustomNumpad";
import type { DashboardMember } from "@/lib/dashboard";
import type { ExpenseSplitType } from "@/lib/expenses";

type CoupleExpenseIconKey = "shopping-cart" | "car" | "utensils" | "home" | "receipt" | "deposit";

interface CoupleDashboardExpense {
    id: string;
    concept: string;
    amount: number;
    paid_by: string;
    paidBy?: string;
    responsible_for?: string | null;
    category?: string | null;
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
    is_settled?: boolean;
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
    fundBalance: number;
    personalBalance: number;
}

const iconMap: Record<CoupleExpenseIconKey, LucideIcon> = {
    "shopping-cart": ShoppingCart,
    car: CarFront,
    utensils: UtensilsCrossed,
    home: House,
    receipt: Wrench,
    deposit: Plus,
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

function getExpenseCategoryPresentation(category?: string | null, concept?: string) {
    switch (category) {
        case "super":
            return { iconKey: "shopping-cart" as CoupleExpenseIconKey, label: "Super" };
        case "food":
            return { iconKey: "utensils" as CoupleExpenseIconKey, label: "Comida" };
        case "transport":
            return { iconKey: "car" as CoupleExpenseIconKey, label: "Transporte" };
        case "home":
            return { iconKey: "home" as CoupleExpenseIconKey, label: "Hogar" };
        case "deposit":
            return { iconKey: "deposit" as CoupleExpenseIconKey, label: "Aporte" };
        case "other":
            return { iconKey: "receipt" as CoupleExpenseIconKey, label: "Otros" };
        default: {
            const normalized = (concept ?? "").toLowerCase();

            if (/super|market|compra|grocery/.test(normalized)) {
                return { iconKey: "shopping-cart" as CoupleExpenseIconKey, label: "Super" };
            }

            if (/cafe|café|coffee|comida|rest|restaurant|almuerzo|cena/.test(normalized)) {
                return { iconKey: "utensils" as CoupleExpenseIconKey, label: "Comida" };
            }

            if (/gas|gasolina|uber|taxi|auto|car|bus|bici|viaje/.test(normalized)) {
                return { iconKey: "car" as CoupleExpenseIconKey, label: "Transporte" };
            }

            return { iconKey: "receipt" as CoupleExpenseIconKey, label: "Otros" };
        }
    }
}

export default function DashboardCouple({
    familyId,
    currentUserId,
    familyName,
    currentUserName,
    members,
    expenses,
    mySpent: _mySpent,
    partnerSpent: _partnerSpent,
    fundBalance,
    personalBalance,
}: DashboardCoupleProps) {
    const mySpent = 150;
    const myBudget = 400;
    const fundSpent = 650;
    const fundBudget = 1000;

    const router = useRouter();
    const [activeFilter, setActiveFilter] = useState<ActivityFilter>("compartido");
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenseModalKey, setExpenseModalKey] = useState(0);
    const [showBalances, setShowBalances] = useState(false);
    const [showBudget, setShowBudget] = useState(false);
    const [depositAmount, setDepositAmount] = useState("");
    const [depositError, setDepositError] = useState("");
    const [isDepositing, startDepositTransition] = useTransition();
    const [isLiquidating, startLiquidatingTransition] = useTransition();
    const [showSettleModal, setShowSettleModal] = useState(false);
    const partner = members.find((member) => member.id !== currentUserId) ?? null;
    const partnerId = partner?.id ?? null;
    const fundAmount = Math.round(Math.abs(fundBalance) * 100) / 100;
    const deudorId = fundAmount === 0 || !partner ? null : fundBalance < 0 ? currentUserId : partner.id;
    const acreedorId = fundAmount === 0 || !partner ? null : fundBalance > 0 ? currentUserId : partner.id;


    const fundDeposits = useMemo(() =>
        expenses.filter(e => e.category === "deposit").reduce((sum, e) => sum + Number(e.amount || 0), 0),
        [expenses]
    );
    const fundWithdrawals = useMemo(() =>
        expenses.filter(e => e.category === "withdrawal").reduce((sum, e) => sum + Number(e.amount || 0), 0),
        [expenses]
    );
    const fundLiquidity = fundDeposits - fundWithdrawals;


    // Solo sumar si NO está liquidado
    const fundOwesMe = useMemo(() => {
        return expenses.reduce((sum, expense) => {
            const paidBy = expense.paid_by || expense.paidBy;
            if (
                paidBy !== currentUserId ||
                expense.responsible_for !== "joint_fund" ||
                expense.category === "deposit" ||
                expense.is_settled
            ) {
                return sum;
            }
            return sum + Number(expense.amount || 0);
        }, 0);
    }, [currentUserId, expenses]);

    // Extraer la lista exacta de esos gastos para mostrarlos en el modal
    const fundDebtExpenses = useMemo(() =>
        expenses.filter(
            (expense) =>
                (expense.paid_by || expense.paidBy) === currentUserId &&
                expense.responsible_for === "joint_fund" &&
                expense.category !== "deposit" &&
                !expense.is_settled
        ),
        [currentUserId, expenses]
    );

    const iOwePartner = useMemo(() => {
        return expenses
            .filter(
                (expense) =>
                    (expense.paid_by || expense.paidBy) !== currentUserId &&
                    (expense.paid_by || expense.paidBy) !== "joint_fund" &&
                    expense.responsible_for === currentUserId &&
                    expense.category !== "deposit"
            )
            .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    }, [currentUserId, expenses]);

    const partnerOwesMe = useMemo(() => {
        return expenses
            .filter(
                (expense) =>
                    (expense.paid_by || expense.paidBy) === currentUserId &&
                    expense.responsible_for !== currentUserId &&
                    expense.responsible_for !== "joint_fund" &&
                    expense.category !== "deposit"
            )
            .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    }, [currentUserId, expenses]);

            const hasBalances = fundOwesMe > 0 || iOwePartner > 0 || partnerOwesMe > 0;

    const sharedExpenses = useMemo(
        () => expenses.filter((expense) => expense.responsible_for === "joint_fund" || expense.category === "deposit"),
        [expenses]
    );

    const myExpenses = useMemo(
        () => expenses.filter((expense) => expense.responsible_for === currentUserId && expense.category !== "deposit"),
        [currentUserId, expenses]
    );

    const partnerExpenses = useMemo(
        () =>
            expenses.filter(
                (expense) =>
                    expense.responsible_for !== currentUserId &&
                    expense.responsible_for !== "joint_fund" &&
                    expense.category !== "deposit"
            ),
        [currentUserId, expenses]
    );

    console.log("Data cruda recibida en cliente:", expenses);

    const filteredExpenses = useMemo(() => {
        if (activeFilter === "compartido") {
            return sharedExpenses;
        }

        if (activeFilter === "mio") {
            return myExpenses;
        }

        if (activeFilter === "suyo") {
            return partnerExpenses;
        }

        return sharedExpenses;
    }, [activeFilter, myExpenses, partnerExpenses, sharedExpenses]);

    function handleDepositConfirm(nextValue?: string) {
        const normalizedAmount = Number((nextValue ?? depositAmount).replace(/,/g, ".").trim());

        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
            setDepositError("Ingresa un monto válido.");
            return;
        }

        setDepositError("");

        startDepositTransition(async () => {
            await createDeposit({ amount: normalizedAmount });
            setDepositAmount("");
            setIsDepositModalOpen(false);
            router.refresh();
        });
    }


    function handleLiquidate() {
        setShowSettleModal(true);
    }

    function handleSettleFundDebt() {
        if (fundDebtExpenses.length === 0 || fundOwesMe <= 0) return;
        startLiquidatingTransition(async () => {
            await settleFundDebtAction({
                expenseIds: fundDebtExpenses.map(e => e.id),
                totalAmount: fundOwesMe,
                currentUserId,
                familyId,
            });
            setShowSettleModal(false);
            router.refresh();
        });
    }

    function handleSettleP2P(debtorId: string | null, creditorId: string | null, amount: number) {
        if (!debtorId || !creditorId || amount <= 0) {
            return;
        }

        startLiquidatingTransition(async () => {
            await settleDebt({
                deudor_id: debtorId,
                acreedor_id: creditorId,
                monto: amount,
                family_id: familyId,
            });

            router.refresh();
        });
    }

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
                <section className="mb-4 px-2">
                    <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">{familyName}</h1>
                    <p className="text-sm font-medium opacity-70 text-on-surface-variant font-label">
                        Santuario compartido • Hoy
                    </p>
                </section>

                <section className="mb-6">
                    {/* La Cuenta Bancaria del Fondo */}
                    <div className="bg-[#60855c] rounded-3xl p-6 text-white mb-3 shadow-md relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <img
                                className="w-full h-full object-cover"
                                data-alt="smooth abstract flowing waves with subtle grain texture and soft organic shapes in light green tones"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDW6rtFa_USq8iJFAxck_vUy7fkvL4vFeNGyLjrw4v_0WmYOmtnLD2okKywR76zx-eW0TBSh0MNnzkEQPI-H1xkOB7yt-A_4D9MHNQ0s6AO7u1f2FDR757IUOe8R5QevfkwpH4LLueHmrnZvx45CaUVa51P5VAXReh-yqj0anDccMrhZNGmqh0ufqpqHtvYQHLM2ydLKfluKZhX3MXMF8g_5DUHgnJAdWxUlx-fiXWlGrNl-LxlbLSzxXSP-qgVWogOyXXuigyn49L3"
                            />
                        </div>
                        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                        <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-white/70 block mb-1">
                            Disponible en el Fondo
                        </span>
                        <h2 className="relative z-10 text-4xl font-bold mb-6">${fundLiquidity.toFixed(2)}</h2>
                        <div className="flex gap-3 relative z-10">
                            <button
                                type="button"
                                onClick={() => setIsDepositModalOpen(true)}
                                className="bg-white/70 text-[#60855c] px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-sm"
                            >
                                <Plus size={16} /> Aportar
                            </button>
                        </div>
                    </div>

                    {/* Sección de Saldos Pendientes (Solo se renderiza si hay deudas) */}
                    {hasBalances && (
                        <div className="mb-6">
                            {/* Encabezado Toggle */}
                            <button
                                onClick={() => setShowBalances(!showBalances)}
                                className="w-full flex justify-between items-center mb-3 group"
                            >
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xs font-bold text-slate-800">Saldos Pendientes</h2>
                                    <ChevronDown
                                        size={18}
                                        className={`text-slate-400 transition-transform duration-500 ease-out ${showBalances ? "rotate-180" : ""}`}
                                    />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest transition-colors text-orange-500">
                                    {showBalances ? "OCULTAR" : "REVISAR"}
                                </span>
                            </button>

                            {/* Lista Compacta Desplegable */}
                            <div
                                className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                    showBalances ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                }`}
                            >
                                <div className="overflow-hidden">
                                    <div
                                        className={`bg-white rounded-xl  flex flex-col overflow-hidden divide-y divide-slate-50 border border-slate-200 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                            showBalances ? "translate-y-0 scale-100" : "-translate-y-1 scale-[0.98]"
                                        }`}
                                    >
                                    {/* Fila: El Fondo me debe */}
                                    {fundOwesMe > 0 && (
                                        <div className="px-4 py-2 flex items-center justify-between">
                                            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">El fondo te debe</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[12px] font-semibold text-slate-800">${fundOwesMe.toFixed(2)}</span>
                                                <button
                                                    type="button"
                                                    onClick={handleLiquidate}
                                                    disabled={isLiquidating || fundDebtExpenses.length === 0}
                                                    className="text-[9px] bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-full font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    COBRAR
                                                </button>
                                            </div>
                                        </div>
                                    )}
            {/* Modal de Liquidación */}
            {showSettleModal && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowSettleModal(false)} />
                    <div className="relative bg-white rounded-t-[2.5rem] p-6 pb-10 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Cobrar al Fondo</h3>
                        <p className="text-xs text-slate-500 mb-4">Selecciona los gastos que vas a recuperar del fondo común.</p>
                        <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto">
                            {fundDebtExpenses.map(expense => (
                                <div key={expense.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl">
                                    <div>
                                        <p className="text-sm font-bold text-slate-800">{expense.concept}</p>
                                        <p className="text-[10px] text-slate-400">{formatExpenseDate(expense.expense_date)}</p>
                                    </div>
                                    <span className="font-bold text-slate-800">${Number(expense.amount).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={handleSettleFundDebt}
                            className="w-full bg-[#60855c] text-white py-4 rounded-full font-bold shadow-md"
                            disabled={isLiquidating || fundDebtExpenses.length === 0}
                        >
                            Recuperar ${fundOwesMe.toFixed(2)}
                        </button>
                    </div>
                </div>
            )}

                                    {/* Fila: Yo le debo a mi pareja */}
                                    {iOwePartner > 0 && (
                                        <div className="px-4 py-2 flex items-center justify-between">
                                            <span className="text-[9px] font-semibold text-[#bb1b1b] uppercase tracking-wide">Le debes a tu pareja</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[12px] font-semibold text-slate-800">${iOwePartner.toFixed(2)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSettleP2P(currentUserId, partnerId, iOwePartner)}
                                                    disabled={isLiquidating}
                                                    className="text-[9px] bg-[#bb1b1b]/10 text-[#bb1b1b] hover:bg-[#bb1b1b]/30 px-3 py-1.5 rounded-full font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    PAGAR
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Fila: Mi pareja me debe */}
                                    {partnerOwesMe > 0 && (
                                        <div className="px-4 py-2 flex items-center justify-between">
                                            <span className="text-[9px] font-bold text-[#0f2d91] uppercase tracking-wide">Tu pareja te debe</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[12px] font-semibold text-slate-800">${partnerOwesMe.toFixed(2)}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSettleP2P(partnerId, currentUserId, partnerOwesMe)}
                                                    disabled={isLiquidating}
                                                    className="text-[9px] bg-blue-50 text-[#0f2d91] hover:bg-blue-100 px-3 py-1.5 rounded-full font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    COBRAR
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                <div className="mb-4">
                    <button
                        onClick={() => setShowBudget(!showBudget)}
                        className="w-full flex justify-between items-center mb-3 group"
                    >
                        <div className="flex items-center gap-2">
                            <h2 className="text-xs font-bold text-slate-800">Control de Presupuesto</h2>
                            <ChevronDown
                                size={18}
                                className={`text-slate-400 transition-transform duration-500 ease-out ${showBudget ? "rotate-180" : ""}`}
                            />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest transition-colors text-slate-400 group-hover:text-[#60855c]">
                            {showBudget ? "OCULTAR" : "VER"}
                        </span>
                    </button>

                    <div
                        className={`grid transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            showBudget ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                        }`}
                    >
                        <div className="overflow-hidden">
                            <div
                                className={`bg-white rounded-xl border border-slate-200 flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                    showBudget ? "translate-y-0 scale-100" : "-translate-y-1 scale-[0.98]"
                                }`}
                            >
                            <div className="p-3">
                                <div className="flex justify-between items-end mb-1.5">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-0.5">Mi Bolsillo</span>
                                        <span className="text-base font-bold text-slate-800">${mySpent.toFixed(2)}</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-400">de ${myBudget}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1">
                                    <div className="bg-slate-800 h-1 rounded-full" style={{ width: `${Math.min((mySpent / myBudget) * 100, 100)}%` }}></div>
                                </div>
                            </div>

                            <div className="h-px w-full bg-slate-50" />

                            <div className="p-3">
                                <div className="flex justify-between items-end mb-1.5">
                                    <div>
                                        <span className="text-[10px] font-bold text-[#60855c] uppercase tracking-wide block mb-0.5">Fondo Común</span>
                                        <span className="text-base font-bold text-slate-800">${fundSpent.toFixed(2)}</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-400">de ${fundBudget}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1">
                                    <div className="bg-[#60855c] h-1 rounded-full" style={{ width: `${Math.min((fundSpent / fundBudget) * 100, 100)}%` }}></div>
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                </div>

                <section className="mb-6">
                    <div className="flex gap-1 rounded-full bg-slate-100/80 p-1.5">
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
                            <div className="bg-white rounded-3xl shadow-sm flex flex-col mb-8 overflow-hidden">
                                {filteredExpenses.map((expense, index) => {
                                    const categoryPresentation = getExpenseCategoryPresentation(expense.category, expense.concept);
                                    const Icon = iconMap[categoryPresentation.iconKey] ?? ReceiptText;
                                    const isDeposit = expense.category === "deposit";
                                    const isWithdrawal = expense.category === "withdrawal";
                                    const isLast = index === filteredExpenses.length - 1;

                                    return (
                                        <div key={expense.id} className="flex flex-col">
                                            <div className="p-3 flex items-center justify-between bg-transparent">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                                        <Icon size={18} />
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-800">{expense.concept}</span>
                                                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                                                            {categoryPresentation.label} • {formatExpenseDate(expense.expense_date || expense.created_at)} • {expense.paid_by === currentUserId ? "TÚ" : "PAREJA"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <span className={`text-base font-bold ${isDeposit ? 'text-[#60855c]' : isWithdrawal ? 'text-orange-500' : 'text-slate-800'}`}>
                                                    {isDeposit ? '+' : isWithdrawal ? '-' : '-'}${Number(expense.amount).toFixed(2)}
                                                </span>
                                            </div>

                                            {!isLast && <div className="h-px w-full bg-slate-50" />}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            </main>

            <button
                type="button"
                onClick={() => { setIsExpenseModalOpen(true); setExpenseModalKey((k) => k + 1); }}
                className={`fixed right-6 bottom-24 mb-2 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#60855c] text-3xl leading-none text-white shadow-xl transition-all active:scale-95 ${
                    isExpenseModalOpen ? "pointer-events-none opacity-0 scale-90" : "opacity-100 scale-100"
                }`}
                aria-label="Agregar gasto"
            >
                +
            </button>

            {/* Overlay oscuro */}
            {isExpenseModalOpen && (
                <div className="fixed inset-0 z-70 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-500" onClick={() => setIsExpenseModalOpen(false)} />
            )}

            {/* Bottom Sheet del Formulario */}
            <div className={`fixed inset-x-0 bottom-0 z-80 transform transition-transform duration-500 ease-out flex flex-col bg-slate-50 rounded-t-[2.5rem] shadow-2xl h-[80vh] ${isExpenseModalOpen ? "translate-y-0" : "translate-y-full"}`}>
                <div className="flex justify-center items-center pt-4 pb-2 relative">
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                    <button onClick={() => setIsExpenseModalOpen(false)} className="absolute right-6 top-4 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1">
                        <X size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-8 hide-scrollbar">
                    <AddExpenseForm key={expenseModalKey} onClose={() => setIsExpenseModalOpen(false)} familyMemberCount={members.length} />
                </div>
            </div>

            {isDepositModalOpen && (
                <div className="fixed inset-0 z-60">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => {
                            setIsDepositModalOpen(false);
                            setDepositError("");
                        }}
                    />
                    <div className="absolute bottom-0 w-full rounded-t-3xl bg-white  max-h-[92vh] animate-in slide-in-from-bottom duration-300">
                        <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-on-surface/10" />
                        <div className="text-center">
                            <h4 className="text-[10px] font-bold tracking-widest text-gray-500 font-label">
                                APORTAR AL FONDO COMÚN
                            </h4>
                        </div>

                        <CustomNumpad
                            isOpen={isDepositModalOpen}
                            embedded
                            showDisplay
                            initialValue={depositAmount || "0"}
                            onClose={() => setIsDepositModalOpen(false)}
                            onValueChange={(value) => setDepositAmount(value)}
                            onConfirm={(value) => handleDepositConfirm(value)}
                        />

                        {depositError && (
                            <p className="mt-3 text-center text-sm font-medium text-red-600">{depositError}</p>
                        )}

                        {/* <button
                            type="button"
                            onClick={() => handleDepositConfirm()}
                            disabled={isDepositing}
                            className="mt-4 w-full rounded-xl bg-[#60855c] py-4 font-bold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isDepositing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <LoaderCircle size={18} className="animate-spin" />
                                    Guardando...
                                </span>
                            ) : (
                                "Confirmar Aporte"
                            )}
                        </button> */}
                    </div>
                </div>
            )}
        </>
    );
}
