"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    BarChart3,
    CarFront,
    ChevronDown,
    Home,
    Plus,
    Receipt,
    ReceiptText,
    Scale,
    Settings,
    ShoppingCart,
    House,
    User,
    UtensilsCrossed,
    Wrench,
    X,
    Check,
    Edit,
    Trash2,
    type LucideIcon,
} from "lucide-react";
import { settleDebt } from "@/app/actions/debt";
import { createDeposit } from "@/app/actions/expenses";
import { settleFundDebtAction } from "@/app/actions/settleFundDebt";
import { settleP2PAction } from "@/app/actions/settleP2P";
import { createClient } from "@/utils/supabase/client";
import { useExpenseModal } from "@/components/ExpenseModalProvider";
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
    profiles?: {
        full_name: string | null;
        avatar_url: string | null;
    } | null;
    payerName?: string;
    full_name?: string | null;
    is_settled?: boolean;
    family_id?: string;
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
    const supabase = useMemo(() => createClient(), []);
    const { setExpenseToEdit, setIsExpenseModalOpen } = useExpenseModal();
    const [activeFilter, setActiveFilter] = useState<ActivityFilter>("compartido");
    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [showBalances, setShowBalances] = useState(false);
    const [showBudget, setShowBudget] = useState(false);
    const [depositAmount, setDepositAmount] = useState("");
    const [depositError, setDepositError] = useState("");
    const [isDepositing, startDepositTransition] = useTransition();
    const [isLiquidating, startLiquidatingTransition] = useTransition();
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [showChargeModal, setShowChargeModal] = useState(false);
    // Estado de selección múltiple para liquidación
    const [selectedSettleIds, setSelectedSettleIds] = useState<string[]>([]);
    const [isBudgetAnimated, setIsBudgetAnimated] = useState(false);
    const [isBalancesAnimated, setIsBalancesAnimated] = useState(false);
    const [isSettleAnimated, setIsSettleAnimated] = useState(false);
    const [isPayAnimated, setIsPayAnimated] = useState(false);
    const [isChargeAnimated, setIsChargeAnimated] = useState(false);
    const [isDepositAnimated, setIsDepositAnimated] = useState(false);

    const animateIn = (setOpen: (value: boolean) => void, setAnimated: (value: boolean) => void) => {
        setOpen(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)));
    };

    const animateOut = (
        setOpen: (value: boolean) => void,
        setAnimated: (value: boolean) => void,
        onAfterClose?: (() => void) | unknown,
    ) => {
        setAnimated(false);
        window.setTimeout(() => {
            setOpen(false);
            if (typeof onAfterClose === "function") {
                onAfterClose();
            }
        }, 450);
    };

    const openBudgetModal = () => animateIn(setShowBudget, setIsBudgetAnimated);
    const closeBudgetModal = () => animateOut(setShowBudget, setIsBudgetAnimated);
    const openBalancesModal = () => animateIn(setShowBalances, setIsBalancesAnimated);
    const closeBalancesModal = (onAfterClose?: () => void) => animateOut(setShowBalances, setIsBalancesAnimated, onAfterClose);
    const openSettleModal = () => animateIn(setShowSettleModal, setIsSettleAnimated);
    const closeSettleModal = () => animateOut(setShowSettleModal, setIsSettleAnimated, () => setSelectedSettleIds([]));
    const openPayModal = () => animateIn(setShowPayModal, setIsPayAnimated);
    const closePayModal = () => animateOut(setShowPayModal, setIsPayAnimated, () => setSelectedSettleIds([]));
    const openChargeModal = () => animateIn(setShowChargeModal, setIsChargeAnimated);
    const closeChargeModal = () => animateOut(setShowChargeModal, setIsChargeAnimated, () => setSelectedSettleIds([]));
    const openDepositModal = () => animateIn(setIsDepositModalOpen, setIsDepositAnimated);
    const closeDepositModal = () => animateOut(setIsDepositModalOpen, setIsDepositAnimated, () => setDepositError(""));

    // Toggle de selección
    const toggleSettleSelection = (id: string) => {
        setSelectedSettleIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleActions = (id: string) => {
        setActiveActionId(prev => prev === id ? null : id);
    };

    // Gastos P2P pendientes
    // Blindar family_id para transferencias P2P
    const currentFamilyId: string = expenses.length > 0 && expenses[0].family_id ? expenses[0].family_id : '';

    // 1. Gastos donde YO saqué el dinero, pero el responsable es MI PAREJA. (Mi pareja me debe a mí)
    const expensesPartnerOwesMe = useMemo(() =>
        expenses.filter(e =>
            (e.paid_by || e.paidBy) === currentUserId &&
            e.responsible_for !== currentUserId &&
            e.responsible_for !== 'joint_fund' &&
            e.category !== 'deposit' &&
            !e.is_settled
        ),
        [currentUserId, expenses]
    );
    const partnerOwesMe = useMemo(() =>
        expensesPartnerOwesMe.reduce((sum, e) => sum + Number(e.amount || 0), 0),
        [expensesPartnerOwesMe]
    );

    // 2. Gastos donde MI PAREJA sacó el dinero, pero el responsable soy YO. (Yo le debo a mi pareja)
    const expensesIOwePartner = useMemo(() =>
        expenses.filter(e =>
            (e.paid_by || e.paidBy) !== currentUserId &&
            (e.paid_by || e.paidBy) !== 'joint_fund' &&
            e.responsible_for === currentUserId &&
            e.category !== 'deposit' &&
            !e.is_settled
        ),
        [currentUserId, expenses]
    );
    const iOwePartner = useMemo(() =>
        expensesIOwePartner.reduce((sum, e) => sum + Number(e.amount || 0), 0),
        [expensesIOwePartner]
    );
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


    const hasBalances = fundOwesMe > 0 || iOwePartner > 0 || partnerOwesMe > 0;

    // Filtrar gastos de sistema (withdrawal y transfer) de la UI
    const sharedExpenses = useMemo(
        () =>
            expenses.filter(
                (expense) =>
                    (expense.responsible_for === "joint_fund" || expense.category === "deposit") &&
                    expense.category !== "withdrawal" &&
                    expense.category !== "transfer"
            ),
        [expenses]
    );

    const myExpenses = useMemo(
        () =>
            expenses.filter(
                (expense) =>
                    expense.responsible_for === currentUserId &&
                    expense.category !== "deposit" &&
                    expense.category !== "withdrawal" &&
                    expense.category !== "transfer"
            ),
        [currentUserId, expenses]
    );

    const partnerExpenses = useMemo(
        () =>
            expenses.filter(
                (expense) =>
                    expense.responsible_for !== currentUserId &&
                    expense.responsible_for !== "joint_fund" &&
                    expense.category !== "deposit" &&
                    expense.category !== "withdrawal" &&
                    expense.category !== "transfer"
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

    const currentList = filteredExpenses.slice(0, 5);

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
            closeDepositModal();
            router.refresh();
        });
    }

    function handleLiquidate() {
        openSettleModal();
    }

    function handleSettleFundDebt(selectedIds: string[], selectedTotal: number) {
        if (selectedIds.length === 0 || selectedTotal <= 0) return;
        startLiquidatingTransition(async () => {
            await settleFundDebtAction({
                expenseIds: selectedIds,
                totalAmount: selectedTotal,
                currentUserId,
                familyId,
            });
            setIsSettleAnimated(false);
            setShowSettleModal(false);
            setSelectedSettleIds([]);
            router.refresh();
        });
    }

    async function handleSettleP2P(debtorId: string | null, creditorId: string | null, amount: number, expenseIds: string[]) {
        if (!debtorId || !creditorId || amount <= 0 || expenseIds.length === 0) return;
        startLiquidatingTransition(async () => {
            await settleP2PAction({
                payerId: debtorId,
                receiverId: creditorId,
                expenseIds,
                totalAmount: amount,
                familyId: currentFamilyId,
            });
            setIsPayAnimated(false);
            setIsChargeAnimated(false);
            setShowPayModal(false);
            setShowChargeModal(false);
            setSelectedSettleIds([]);
            router.refresh();
        });
    }

    // Supabase Realtime para refrescar dashboard automáticamente
    useEffect(() => {
        const channel = supabase
            .channel(`realtime-expenses-${familyId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'expenses',
                    filter: `family_id=eq.${familyId}`,
                },
                (payload) => {
                    console.log('Cambio detectado en base de datos:', payload);
                    router.refresh();
                }
            )
            .subscribe();

        return () => {
            void supabase.removeChannel(channel);
        };
    }, [familyId, router, supabase]);

    return (
        <div className="flex flex-col h-dvh bg-slate-50 overflow-hidden">
            <header className="shrink-0 z-50 flex w-full items-center justify-between bg-[#F8F9FA]/80 px-6 py-4 backdrop-blur-md">
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

            <main className="mx-auto flex w-full max-w-md flex-1 min-h-0 flex-col overflow-hidden px-4 pt-4">
                <section className="mb-4 shrink-0 px-2">
                    <h1 className="text-2xl font-extrabold tracking-tight text-on-surface">{familyName}</h1>
                    <p className="text-sm font-medium opacity-70 text-on-surface-variant font-label">
                        Santuario compartido • Hoy
                    </p>
                </section>

                <section className="mb-2">
                    {/* La Cuenta Bancaria del Fondo */}
                    <div className="bg-[#60855c] rounded-3xl p-6 text-white mb-3 shadow-md relative overflow-hidden shrink-0">
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
                                onClick={openDepositModal}
                                className="bg-white/70 text-[#60855c] px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-sm"
                            >
                                <Plus size={16} /> Aportar
                            </button>
                        </div>
                    </div>

                    {/* Fila de Acciones Rápidas */}
                    <div className="mb-3 grid grid-cols-2 gap-3 shrink-0">
                        <button
                            onClick={openBudgetModal}
                            className="group flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm transition-all duration-500 hover:border-slate-200"
                        >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                <BarChart3 size={16} />
                            </div>
                            <div className="min-w-0 flex-1 text-left leading-tight">
                                <span className="block truncate text-[13px] font-bold text-slate-800">Presupuesto</span>
                                <span className="block text-[9px] font-medium uppercase tracking-wide text-slate-400">Ver estado</span>
                            </div>
                            <ChevronDown size={14} className="shrink-0 -rotate-90 text-slate-300 transition-transform duration-500" />
                        </button>

                        <button
                            onClick={openBalancesModal}
                            className="group relative flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm transition-all duration-500 hover:border-slate-200"
                        >
                            {hasBalances && (
                                <div className="absolute top-2.5 right-2.5 h-2 w-2 animate-pulse rounded-full border border-white bg-rose-500" />
                            )}
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                                <Scale size={16} />
                            </div>
                            <div className="min-w-0 flex-1 text-left leading-tight">
                                <span className="block truncate text-[13px] font-bold text-slate-800">Liquidar</span>
                                <span className="block text-[9px] font-medium uppercase tracking-wide text-slate-400">Cobrar/Pagar</span>
                            </div>
                            <ChevronDown size={14} className="shrink-0 -rotate-90 text-slate-300 transition-transform duration-500" />
                        </button>
                    </div>

                    {/* Modal de Liquidación: SIEMPRE FUERA DEL STACKING CONTEXT */}
                    {showSettleModal && (
                        <div className="fixed inset-0 z-60 flex flex-col justify-end">
                            <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isSettleAnimated ? "opacity-100" : "opacity-0"}`} onClick={closeSettleModal} />
                            <div className={`relative flex max-h-[90vh] flex-col rounded-t-[2.5rem] bg-white shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSettleAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
                                <div className="flex justify-center pt-4 pb-2">
                                    <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                                </div>
                                <button
                                    onClick={closeSettleModal}
                                    className="absolute top-4 right-6 rounded-full bg-slate-50 p-2 text-slate-400 transition-colors hover:text-slate-600"
                                >
                                    <X size={18} />
                                </button>
                                <div className="hide-scrollbar overflow-y-auto px-6 pb-8">
                                <h3 className="text-lg font-bold text-slate-800 mb-1">Cobrar al Fondo</h3>
                                <p className="text-xs text-slate-500 mb-4">Selecciona los gastos que vas a recuperar del fondo común.</p>
                                {/* Lista seleccionable */}
                                <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                                    {fundDebtExpenses.map(expense => {
                                        const isSelected = selectedSettleIds.includes(expense.id);
                                        return (
                                            <button
                                                key={expense.id}
                                                onClick={() => toggleSettleSelection(expense.id)}
                                                className={`w-full flex justify-between items-center p-4 border rounded-2xl transition-all duration-500 ${isSelected ? 'border-[#60855c] bg-[#60855c]/5' : 'border-slate-100 bg-white'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Custom Checkbox */}
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'border-[#60855c] bg-[#60855c]' : 'border-slate-300'
                                                        }`}>
                                                        {isSelected && <Check size={12} className="text-white" />}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-bold text-slate-800">{expense.concept}</p>
                                                        <p className="text-[10px] text-slate-400">{formatExpenseDate(expense.expense_date)}</p>
                                                    </div>
                                                </div>
                                                <span className={`font-bold ${isSelected ? 'text-[#60855c]' : 'text-slate-800'}`}>
                                                    ${Number(expense.amount).toFixed(2)}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {/* Cálculo Dinámico y Botón */}
                                {(() => {
                                    const selectedTotal = fundDebtExpenses
                                        .filter(e => selectedSettleIds.includes(e.id))
                                        .reduce((sum, e) => sum + Number(e.amount), 0);
                                    return (
                                        <button
                                            disabled={selectedSettleIds.length === 0 || isLiquidating}
                                            onClick={() => handleSettleFundDebt(selectedSettleIds, selectedTotal)}
                                            className={`w-full py-4 rounded-full font-bold shadow-md transition-all ${selectedSettleIds.length === 0 || isLiquidating
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'bg-[#60855c] text-white'
                                                }`}
                                        >
                                            Recuperar {selectedTotal > 0 ? `$${selectedTotal.toFixed(2)}` : ''}
                                        </button>
                                    );
                                })()}
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Modal P2P: PAGAR */}
                    {showPayModal && (
                        <div className="fixed inset-0 z-60 flex flex-col justify-end">
                            <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isPayAnimated ? "opacity-100" : "opacity-0"}`} onClick={closePayModal} />
                            <div className={`relative flex max-h-[90vh] flex-col rounded-t-[2.5rem] bg-white shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isPayAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
                                <div className="flex justify-center pt-4 pb-2">
                                    <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                                </div>
                                <button
                                    onClick={closePayModal}
                                    className="absolute top-4 right-6 rounded-full bg-slate-50 p-2 text-slate-400 transition-colors hover:text-slate-600"
                                >
                                    <X size={18} />
                                </button>
                                <div className="hide-scrollbar overflow-y-auto px-6 pb-8">
                                <h3 className="text-lg font-bold text-slate-800 mb-1">Pagar a tu pareja</h3>
                                <p className="text-xs text-slate-500 mb-4">Selecciona los gastos que vas a liquidar.</p>
                                {/* Lista seleccionable */}
                                <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                                    {expensesIOwePartner.map(expense => {
                                        const isSelected = selectedSettleIds.includes(expense.id);
                                        return (
                                            <button
                                                key={expense.id}
                                                onClick={() => toggleSettleSelection(expense.id)}
                                                className={`w-full flex justify-between items-center p-4 border rounded-2xl transition-all duration-500 ${isSelected ? 'border-[#bb1b1b] bg-[#bb1b1b]/5' : 'border-slate-100 bg-white'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Custom Checkbox */}
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'border-[#bb1b1b] bg-[#bb1b1b]' : 'border-slate-300'
                                                        }`}>
                                                        {isSelected && <Check size={12} className="text-white" />}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-bold text-slate-800">{expense.concept}</p>
                                                        <p className="text-[10px] text-slate-400">{formatExpenseDate(expense.expense_date)}</p>
                                                    </div>
                                                </div>
                                                <span className={`font-bold ${isSelected ? 'text-[#bb1b1b]' : 'text-slate-800'}`}>
                                                    ${Number(expense.amount).toFixed(2)}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {/* Cálculo Dinámico y Botón */}
                                {(() => {
                                    const selectedTotal = expensesIOwePartner
                                        .filter(e => selectedSettleIds.includes(e.id))
                                        .reduce((sum, e) => sum + Number(e.amount), 0);
                                    return (
                                        <button
                                            disabled={selectedSettleIds.length === 0 || isLiquidating}
                                            onClick={() => handleSettleP2P(currentUserId, partnerId, selectedTotal, selectedSettleIds)}
                                            className={`w-full py-4 rounded-full font-bold shadow-md transition-all ${selectedSettleIds.length === 0 || isLiquidating
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'bg-[#bb1b1b] text-white'
                                                }`}
                                        >
                                            Pagar {selectedTotal > 0 ? `$${selectedTotal.toFixed(2)}` : ''}
                                        </button>
                                    );
                                })()}
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Modal P2P: COBRAR */}
                    {showChargeModal && (
                        <div className="fixed inset-0 z-60 flex flex-col justify-end">
                            <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isChargeAnimated ? "opacity-100" : "opacity-0"}`} onClick={closeChargeModal} />
                            <div className={`relative flex max-h-[90vh] flex-col rounded-t-[2.5rem] bg-white shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isChargeAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
                                <div className="flex justify-center pt-4 pb-2">
                                    <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                                </div>
                                <button
                                    onClick={closeChargeModal}
                                    className="absolute top-4 right-6 rounded-full bg-slate-50 p-2 text-slate-400 transition-colors hover:text-slate-600"
                                >
                                    <X size={18} />
                                </button>
                                <div className="hide-scrollbar overflow-y-auto px-6 pb-8">
                                <h3 className="text-lg font-bold text-slate-800 mb-1">Cobrar a tu pareja</h3>
                                <p className="text-xs text-slate-500 mb-4">Selecciona los gastos que vas a marcar como pagados.</p>
                                {/* Lista seleccionable */}
                                <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                                    {expensesPartnerOwesMe.map(expense => {
                                        const isSelected = selectedSettleIds.includes(expense.id);
                                        return (
                                            <button
                                                key={expense.id}
                                                onClick={() => toggleSettleSelection(expense.id)}
                                                className={`w-full flex justify-between items-center p-4 border rounded-2xl transition-all duration-500 ${isSelected ? 'border-[#0f2d91] bg-[#0f2d91]/5' : 'border-slate-100 bg-white'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Custom Checkbox */}
                                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'border-[#0f2d91] bg-[#0f2d91]' : 'border-slate-300'
                                                        }`}>
                                                        {isSelected && <Check size={12} className="text-white" />}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-bold text-slate-800">{expense.concept}</p>
                                                        <p className="text-[10px] text-slate-400">{formatExpenseDate(expense.expense_date)}</p>
                                                    </div>
                                                </div>
                                                <span className={`font-bold ${isSelected ? 'text-[#0f2d91]' : 'text-slate-800'}`}>
                                                    ${Number(expense.amount).toFixed(2)}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {/* Cálculo Dinámico y Botón */}
                                {(() => {
                                    const selectedTotal = expensesPartnerOwesMe
                                        .filter(e => selectedSettleIds.includes(e.id))
                                        .reduce((sum, e) => sum + Number(e.amount), 0);
                                    return (
                                        <button
                                            disabled={selectedSettleIds.length === 0 || isLiquidating}
                                            onClick={() => handleSettleP2P(partnerId, currentUserId, selectedTotal, selectedSettleIds)}
                                            className={`w-full py-4 rounded-full font-bold shadow-md transition-all ${selectedSettleIds.length === 0 || isLiquidating
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'bg-[#0f2d91] text-white'
                                                }`}
                                        >
                                            Cobrar {selectedTotal > 0 ? `$${selectedTotal.toFixed(2)}` : ''}
                                        </button>
                                    );
                                })()}
                                </div>
                            </div>
                        </div>
                    )}
                </section>


                <div className="flex-1 flex flex-col min-h-0  mb-24 px-2">
                    {/* <div className="shrink-0 flex justify-between items-center mb-4">
                        <h3 className="text-base font-bold text-slate-800">Actividad Compartida</h3>
                        <Link
                            href="/history"
                            className="text-[10px] font-bold uppercase tracking-widest text-[#60855c] transition-opacity hover:opacity-80 font-label"
                        >
                            Ver todo
                        </Link>
                    </div> */}

                    <div className="shrink-0 mb-4">
                        <div className="flex gap-1 rounded-full bg-slate-100/80 p-1.5">
                            <button
                                type="button"
                                onClick={() => setActiveFilter("compartido")}
                                className={`flex-1 rounded-full py-2 text-xs font-bold transition-all duration-500 font-label ${activeFilter === "compartido"
                                    ? "bg-slate-100 text-[#2B3437] shadow-sm"
                                    : "text-on-surface-variant hover:bg-surface-container-high/50"
                                    }`}
                            >
                                Compartido
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveFilter("mio")}
                                className={`flex-1 rounded-full py-2 text-xs font-bold transition-all duration-500 font-label ${activeFilter === "mio"
                                    ? "bg-slate-100 text-[#2B3437] shadow-sm"
                                    : "text-on-surface-variant hover:bg-surface-container-high/50"
                                    }`}
                            >
                                Mío
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveFilter("suyo")}
                                className={`flex-1 rounded-full py-2 text-xs font-bold transition-all duration-500 font-label ${activeFilter === "suyo"
                                    ? "bg-slate-100 text-[#2B3437] shadow-sm"
                                    : "text-on-surface-variant hover:bg-surface-container-high/50"
                                    }`}
                            >
                                Suyo
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-3xl shadow-sm flex flex-col overflow-hidden">
                        {currentList.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full animate-in fade-in duration-1000">
                                <div className="relative mb-5 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full bg-[#60855c] opacity-10 animate-ping duration-1000" />
                                    <div className="absolute inset-0 rounded-full bg-[#60855c] opacity-20 animate-pulse" />

                                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-emerald-100/50 bg-emerald-50 text-[#60855c] shadow-sm">
                                        <Receipt size={36} strokeWidth={1.5} />
                                    </div>
                                </div>

                                <h4 className="mb-2 text-lg font-bold text-slate-700">Todo está tranquilo</h4>
                                <p className="max-w-[220px] text-xs leading-relaxed text-slate-400">
                                    Aún no hay movimientos aquí. Usa el botón verde para registrar tu primer gasto.
                                </p>
                            </div>
                        ) : (
                            <div className="flex h-full flex-col">
                                {currentList.map((expense) => {
                                    const categoryPresentation = getExpenseCategoryPresentation(expense.category, expense.concept);
                                    const Icon = iconMap[categoryPresentation.iconKey] ?? ReceiptText;
                                    const isDeposit = expense.category === "deposit";
                                    const isDebt = expense.paid_by !== expense.responsible_for && expense.category !== "deposit";

                                    return (
                                        <div
                                            key={expense.id}
                                            className={`relative flex items-stretch border-b border-slate-50 last:border-0 bg-white overflow-hidden group ${
                                                currentList.length >= 5 ? 'flex-1' : ''
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => toggleActions(expense.id)}
                                                className={`flex items-center justify-between px-4 transition-all duration-300 ease-out w-full text-left ${
                                                    currentList.length >= 5 ? 'h-full' : 'py-4'
                                                } ${
                                                    activeActionId === expense.id ? 'scale-[1] bg-slate-50 pr-2 inset-shadow-zinc-700' : 'scale-100 bg-white'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-800/10 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0 shadow-sm">
                                                        <Icon size={18} />
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-800">{expense.concept}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                                                                {formatExpenseDate(expense.expense_date || expense.created_at)} • {expense.paid_by === currentUserId ? 'TÚ' : 'PAREJA'}
                                                            </span>
                                                            {isDebt && (
                                                                <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${expense.is_settled
                                                                        ? 'bg-emerald-50 text-emerald-600'
                                                                        : 'bg-orange-50 text-orange-600'
                                                                    }`}>
                                                                    {expense.is_settled ? 'Liquidado' : 'Pendiente'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <span className={`text-base font-bold shrink-0 ${isDeposit ? 'text-[#60855c]' : 'text-slate-800'}`}>
                                                    {isDeposit ? '+' : '-'}${Number(expense.amount).toFixed(2)}
                                                </span>
                                            </button>

                                            <div
                                                className={`flex flex-col border-l border-slate-100 transition-all duration-300 ease-out overflow-hidden shrink-0 ${
                                                    activeActionId === expense.id ? 'w-14 opacity-100' : 'w-0 opacity-0 border-transparent'
                                                }`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpenseToEdit(expense);
                                                        setIsExpenseModalOpen(true);
                                                        setActiveActionId(null);
                                                    }}
                                                    className="flex-1 flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-blue-50 bg-slate-50/50 transition-colors border-b border-slate-100"
                                                >
                                                    <Edit size={16} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); }}
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

            {showBudget && (
                <div className="fixed inset-0 z-60 flex flex-col justify-end">
                    <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isBudgetAnimated ? "opacity-100" : "opacity-0"}`} onClick={closeBudgetModal} />
                    <div className={`relative flex max-h-[90vh] flex-col rounded-t-[2.5rem] bg-white shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isBudgetAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
                        <div className="flex justify-center pt-4 pb-2">
                            <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                        </div>
                        <button type="button" onClick={closeBudgetModal} className="absolute top-4 right-6 rounded-full bg-slate-50 p-2 text-slate-400 transition-colors hover:text-slate-600">
                            <X size={18} />
                        </button>
                        <div className="hide-scrollbar overflow-y-auto px-6 pb-8">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Control de Presupuesto</h3>
                                <p className="text-xs text-slate-500">Estado actual de tus bolsillos y del fondo común.</p>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white divide-y divide-slate-50">
                            <div className="p-4">
                                <div className="mb-2 flex items-end justify-between">
                                    <div>
                                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Mi Bolsillo</span>
                                        <span className="text-base font-bold text-slate-800">${mySpent.toFixed(2)}</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-400">de ${myBudget}</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-slate-100">
                                    <div className="h-1.5 rounded-full bg-slate-800" style={{ width: `${Math.min((mySpent / myBudget) * 100, 100)}%` }} />
                                </div>
                            </div>

                            <div className="p-4">
                                <div className="mb-2 flex items-end justify-between">
                                    <div>
                                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#60855c]">Fondo Común</span>
                                        <span className="text-base font-bold text-slate-800">${fundSpent.toFixed(2)}</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-400">de ${fundBudget}</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-slate-100">
                                    <div className="h-1.5 rounded-full bg-[#60855c]" style={{ width: `${Math.min((fundSpent / fundBudget) * 100, 100)}%` }} />
                                </div>
                            </div>
                        </div>
                        </div>
                    </div>
                </div>
            )}

            {showBalances && (
                <div className="fixed inset-0 z-60 flex flex-col justify-end">
                    <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isBalancesAnimated ? "opacity-100" : "opacity-0"}`} onClick={() => closeBalancesModal()} />
                    <div className={`relative flex max-h-[90vh] flex-col rounded-t-[2.5rem] bg-white shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isBalancesAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
                        <div className="flex justify-center pt-4 pb-2">
                            <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                        </div>
                        <button type="button" onClick={() => closeBalancesModal()} className="absolute top-4 right-6 rounded-full bg-slate-50 p-2 text-slate-400 transition-colors hover:text-slate-600">
                            <X size={18} />
                        </button>
                        <div className="hide-scrollbar overflow-y-auto px-6 pb-8">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Saldos Pendientes</h3>
                                <p className="text-xs text-slate-500">Gestiona aquí lo que puedes cobrar o pagar.</p>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white divide-y divide-slate-50">
                            {fundOwesMe > 0 && (
                                <div className="flex items-center justify-between p-4">
                                    <div>
                                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">El fondo te debe</span>
                                        <span className="text-sm font-bold text-slate-800">${fundOwesMe.toFixed(2)}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            closeBalancesModal(() => openSettleModal());
                                        }}
                                        disabled={isLiquidating || fundDebtExpenses.length === 0}
                                        className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        COBRAR
                                    </button>
                                </div>
                            )}

                            {iOwePartner > 0 && (
                                <div className="flex items-center justify-between p-4">
                                    <div>
                                        <span className="block text-[10px] font-bold uppercase tracking-wide text-[#bb1b1b]">Le debes a tu pareja</span>
                                        <span className="text-sm font-bold text-slate-800">${iOwePartner.toFixed(2)}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            closeBalancesModal(() => openPayModal());
                                        }}
                                        disabled={isLiquidating}
                                        className="rounded-full bg-[#bb1b1b]/10 px-3 py-1.5 text-[10px] font-bold text-[#bb1b1b] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        PAGAR
                                    </button>
                                </div>
                            )}

                            {partnerOwesMe > 0 && (
                                <div className="flex items-center justify-between p-4">
                                    <div>
                                        <span className="block text-[10px] font-bold uppercase tracking-wide text-[#0f2d91]">Tu pareja te debe</span>
                                        <span className="text-sm font-bold text-slate-800">${partnerOwesMe.toFixed(2)}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            closeBalancesModal(() => openChargeModal());
                                        }}
                                        disabled={isLiquidating}
                                        className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-bold text-[#0f2d91] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        COBRAR
                                    </button>
                                </div>
                            )}

                            {!hasBalances && (
                                <div className="p-4 text-sm font-medium text-slate-500">
                                    No hay saldos pendientes por ahora.
                                </div>
                            )}
                        </div>
                        </div>
                    </div>
                </div>
            )}


            {isDepositModalOpen && (
                <div className="fixed inset-0 z-60 flex flex-col justify-end">
                    <div
                        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isDepositAnimated ? "opacity-100" : "opacity-0"}`}
                        onClick={closeDepositModal}
                    />
                    <div className={`relative flex max-h-[90vh] flex-col rounded-t-[2.5rem] bg-white shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isDepositAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
                        <div className="flex justify-center pt-4 pb-2">
                            <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                        </div>
                        <button
                            onClick={closeDepositModal}
                            className="absolute top-4 right-6 rounded-full bg-slate-50 p-2 text-slate-400 transition-colors hover:text-slate-600"
                        >
                            <X size={18} />
                        </button>
                        <div className="hide-scrollbar overflow-y-auto px-6 pb-8">
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
                        </div>

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
        </div>
    );
}
