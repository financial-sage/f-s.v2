"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    BarChart3,
    ChevronDown,
    Home,
    Plus,
    Receipt,
    ReceiptText,
    Scale,
    Settings,
    Crown,
    Bell,
    House,
    User,
    X,
    Check,
    Edit,
    Trash2,
    Sparkles,
    ChevronRight,
    ChevronLeft,
    SlidersHorizontal,
    Lock,
    type LucideIcon,
} from "lucide-react";
import { settleDebt } from "@/app/actions/debt";
import { createDeposit, createPersonalDeposit, deleteExpenseAction } from "@/app/actions/expenses";
import { settleFundDebtAction } from "@/app/actions/settleFundDebt";
import { settleP2PAction } from "@/app/actions/settleP2P";
import { createClient } from "@/utils/supabase/client";
import { useExpenseModal } from "@/components/ExpenseModalProvider";
import ProfileDrawer from "@/components/ProfileDrawer";
import CustomNumpad from "@/components/CustomNumpad";
import type { DashboardMember } from "@/lib/dashboard";
import type { ExpenseSplitType } from "@/lib/expenses";
import { getCategoryDetails } from "@/lib/categoryMap";


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

type ActivityFilter = "all" | "personal" | "shared_all" | "shared_me" | "shared_partner";

interface DashboardCoupleProps {
    familyId: string;
    currentUserId: string;
    familyName: string;
    currentUserName: string;
    partnerFirstName: string;
    members: DashboardMember[];
    expenses: CoupleDashboardExpense[];
    mySpent: number;
    partnerSpent: number;
    fundBalance: number;
    personalBalance: number;
    financialModel?: string;
}


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

function getFirstName(value?: string | null, fallback = "Mi pareja") {
    const firstName = value?.trim().split(/\s+/)[0];
    return firstName || fallback;
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

function getExpenseCategoryPresentation(category?: string | null) {
    const { icon, label } = getCategoryDetails(category ?? "");
    return { icon, label };
}

export default function DashboardCouple({
    familyId,
    currentUserId,
    familyName,
    currentUserName,
    partnerFirstName,
    members,
    expenses,
    mySpent: _mySpent,
    partnerSpent: _partnerSpent,
    fundBalance,
    personalBalance,
    financialModel = "joint_fund",
}: DashboardCoupleProps) {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const { setExpenseToEdit, setIsExpenseModalOpen } = useExpenseModal();
    const [currentFilter, setCurrentFilter] = useState<ActivityFilter>("all");
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [isFilterAnimated, setIsFilterAnimated] = useState(false);
    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const [depositTarget, setDepositTarget] = useState<"shared" | "personal" | null>(null);
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
    const [showSharedWelcome, setShowSharedWelcome] = useState(false);
    const [welcomeProgress, setWelcomeProgress] = useState(0);
    const [highlightFundCard, setHighlightFundCard] = useState(false);
    const [animateSharedEntrance, setAnimateSharedEntrance] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, startDeletingTransition] = useTransition();
    const [systemNotification, setSystemNotification] = useState<string | null>(null);

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
    const openFilterModal = () => animateIn(setShowFilterModal, setIsFilterAnimated);
    const closeFilterModal = () => animateOut(setShowFilterModal, setIsFilterAnimated);

    const openDeleteModal = (id: string) => {
        setExpenseToDelete(id);
        setIsDeleteModalOpen(true);
    };
    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setExpenseToDelete(null);
    };
    const handleDeleteConfirm = () => {
        if (!expenseToDelete) return;
        startDeletingTransition(async () => {
            try {
                await deleteExpenseAction(expenseToDelete);
                closeDeleteModal();
                router.refresh();
            } catch {
                closeDeleteModal();
            }
        });
    };

    const showToast = (message: string) => {
        setSystemNotification(message);
        window.setTimeout(() => setSystemNotification(null), 3000);
    };
    const openDepositModal = () => {
        setDepositTarget("shared");
        requestAnimationFrame(() => requestAnimationFrame(() => setIsDepositAnimated(true)));
    };
    const openPersonalDepositModal = () => {
        setDepositTarget("personal");
        requestAnimationFrame(() => requestAnimationFrame(() => setIsDepositAnimated(true)));
    };
    const closeDepositModal = () => {
        setIsDepositAnimated(false);
        window.setTimeout(() => {
            setDepositTarget(null);
            setDepositAmount("");
            setDepositError("");
        }, 450);
    };

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
    const partnerDisplayName = getFirstName(partnerFirstName, getFirstName(partner?.name));
    const partnerShortLabel = partnerDisplayName.length <= 8
        ? partnerDisplayName.toUpperCase()
        : getInitials(partnerDisplayName);
    const fundAmount = Math.round(Math.abs(fundBalance) * 100) / 100;
    const deudorId = fundAmount === 0 || !partner ? null : fundBalance < 0 ? currentUserId : partner.id;
    const acreedorId = fundAmount === 0 || !partner ? null : fundBalance > 0 ? currentUserId : partner.id;


    const myTotalIncome = useMemo(
        () =>
            expenses
                .filter(
                    (expense) =>
                        expense.category === "deposit" &&
                        (expense.responsible_for === currentUserId || expense.responsible_for === "mio")
                )
                .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        [currentUserId, expenses]
    );
    // Todo el dinero que salió físicamente del bolsillo del usuario (excluye movimientos internos de sistema)
    const moneyOutFromMe = useMemo(
        () =>
            expenses
                .filter(
                    (expense) =>
                        (expense.paid_by || expense.paidBy) === currentUserId &&
                        expense.category !== "deposit" &&
                        expense.category !== "withdrawal"
                )
                .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        [currentUserId, expenses]
    );
    // mySpent: solo gastos donde el usuario es responsable, para la barra de progreso
    const mySpent = useMemo(
        () =>
            expenses
                .filter(
                    (expense) =>
                        (expense.responsible_for === currentUserId || expense.responsible_for === "mio") &&
                        expense.category !== "deposit" &&
                        expense.category !== "withdrawal"
                )
                .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        [currentUserId, expenses]
    );
    const myAvailableFund = myTotalIncome - moneyOutFromMe;
    const myBudget = Math.max(mySpent, 400);

    const fundIncome = useMemo(
        () =>
            expenses
                .filter(
                    (expense) => expense.category === "deposit" && expense.responsible_for === "joint_fund"
                )
                .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        [expenses]
    );
    const fundWithdrawals = useMemo(
        () =>
            expenses
                .filter(
                    (expense) => expense.category === "withdrawal" && expense.responsible_for === "joint_fund"
                )
                .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        [expenses]
    );
    const fundDirectExpenses = useMemo(
        () =>
            expenses
                .filter(
                    (expense) =>
                        expense.responsible_for === "joint_fund" &&
                        // Solo resta si el dinero salió físicamente del fondo (cash-flow real)
                        (expense.paid_by === "joint_fund" || expense.paidBy === "joint_fund") &&
                        expense.category !== "deposit" &&
                        expense.category !== "withdrawal"
                )
                .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        [expenses]
    );
    // El fondo solo resta gastos donde el dinero físicamente salió de él (contabilidad de caja)
    const fundLiquidity = fundIncome - fundDirectExpenses - fundWithdrawals;
    const fundSpent = Math.max(fundLiquidity, 0);
    const fundBudget = Math.max(fundSpent, 1000);
    const isJointModel = financialModel === "joint_fund";
    const hasP2PBalance = iOwePartner > 0 || partnerOwesMe > 0;
    const secondaryWidgetTitle = isJointModel ? "Fondo Común" : "Balance P2P";
    const secondaryWidgetValue = isJointModel ? fundLiquidity : personalBalance;
    const secondaryWidgetHint = isJointModel
        ? ""
        : hasP2PBalance
            ? personalBalance >= 0
                ? "A tu favor"
                : "Por pagar"
            : "Sin deuda";


    // Préstamos personales al fondo aún no recuperados (calculado directamente)
    const fundOwesMe = useMemo(
        () =>
            expenses
                .filter(
                    (expense) =>
                        (expense.paid_by || expense.paidBy) === currentUserId &&
                        expense.responsible_for === "joint_fund" &&
                        expense.is_settled === false
                )
                .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        [currentUserId, expenses]
    );

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

    // Filtrar gastos de sistema (withdrawal, transfer y registros internos de liquidación)
    const activityExpenses = useMemo(
        () =>
            expenses.filter(
                (expense) =>
                    expense.category !== "withdrawal" &&
                    expense.category !== "transfer" &&
                    expense.concept !== "Reembolso del fondo" &&
                    expense.concept !== "Liquidación de deuda"
            ),
        [expenses]
    );

    const sharedExpenses = useMemo(
        () =>
            activityExpenses.filter(
                (expense) =>
                    expense.responsible_for === "joint_fund" ||
                    (expense.category === "deposit" && expense.responsible_for === "joint_fund")
            ),
        [activityExpenses]
    );

    const myExpenses = useMemo(
        () =>
            activityExpenses.filter(
                (expense) =>
                    expense.responsible_for === currentUserId ||
                    ((expense.paid_by || expense.paidBy) === currentUserId && expense.category !== "deposit")
            ),
        [activityExpenses, currentUserId]
    );

    const filteredExpenses = useMemo(() => {
        switch (currentFilter) {
            case "personal":
                return activityExpenses.filter(
                    (e) =>
                        (e.responsible_for === currentUserId || e.responsible_for === "mio") &&
                        e.category !== "deposit"
                );
            case "shared_all":
                return activityExpenses.filter((e) => e.responsible_for === "joint_fund");
            case "shared_me":
                return activityExpenses.filter(
                    (e) =>
                        e.responsible_for === "joint_fund" &&
                        (e.paid_by || e.paidBy) === currentUserId
                );
            case "shared_partner":
                return activityExpenses.filter(
                    (e) =>
                        e.responsible_for === "joint_fund" &&
                        (e.paid_by || e.paidBy) !== currentUserId
                );
            case "all":
            default:
                return activityExpenses;
        }
    }, [activityExpenses, currentFilter, currentUserId]);

    const currentList = filteredExpenses.slice(0, 5);

    function handleDepositConfirm(nextValue?: string) {
        const normalizedAmount = Number((nextValue ?? depositAmount).replace(/,/g, ".").trim());

        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
            setDepositError("Ingresa un monto válido.");
            return;
        }

        setDepositError("");

        startDepositTransition(async () => {
            if (depositTarget === "personal") {
                await createPersonalDeposit({ amount: normalizedAmount });
            } else {
                await createDeposit({ amount: normalizedAmount });
            }

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

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const pendingWelcome = window.sessionStorage.getItem("fsage:shared-welcome");

        if (!pendingWelcome) {
            return;
        }

        window.sessionStorage.removeItem("fsage:shared-welcome");
        setShowSharedWelcome(true);
        setHighlightFundCard(true);
        setAnimateSharedEntrance(true);
        setWelcomeProgress(0);
        requestAnimationFrame(() => requestAnimationFrame(() => setWelcomeProgress(100)));

        const timeoutId = window.setTimeout(() => {
            setShowSharedWelcome(false);
            setWelcomeProgress(0);
            setHighlightFundCard(false);
        }, 2600);

        return () => window.clearTimeout(timeoutId);
    }, []);

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

    useEffect(() => {
        const channel = supabase
            .channel(`family-settings-updates-${familyId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "families",
                    filter: `id=eq.${familyId}`,
                },
                (payload) => {
                    const previousModel =
                        payload.old && typeof payload.old === "object" && "financial_model" in payload.old
                            ? payload.old.financial_model
                            : null;
                    const nextModel =
                        payload.new && typeof payload.new === "object" && "financial_model" in payload.new
                            ? payload.new.financial_model
                            : null;
                    const previousSplitPct =
                        payload.old && typeof payload.old === "object" && "user_1_split_pct" in payload.old
                            ? payload.old.user_1_split_pct
                            : null;
                    const nextSplitPct =
                        payload.new && typeof payload.new === "object" && "user_1_split_pct" in payload.new
                            ? payload.new.user_1_split_pct
                            : null;

                    if (previousModel === nextModel && previousSplitPct === nextSplitPct) {
                        return;
                    }

                    if (typeof window !== "undefined") {
                        showToast("Configuración financiera actualizada por tu pareja.");
                    }

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
                <button
                    type="button"
                    onClick={() => setIsProfileOpen(true)}
                    className="flex items-center gap-3 cursor-pointer"
                >
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
                    <span className="text-lg font-bold text-[#2B3437] font-headline">SinDescuadre</span>
                </button>
                <div className="flex items-center gap-3">
                    {/* Botón Premium (Visual) */}
                    <div className="flex items-center gap-1 bg-amber-100/80 border border-amber-200/50 text-amber-700 px-1.5 py-1.5 rounded-full shadow-sm backdrop-blur-sm cursor-pointer hover:bg-amber-100 transition-colors">
                        <Crown size={14} className="fill-amber-500 text-amber-600" />
                        {/* <span className="text-[10px] font-extrabold uppercase tracking-widest">Premium</span> */}
                    </div>

                    {/* Campana de Notificaciones */}
                    <button
                        type="button"
                        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 shadow-sm border border-slate-200/50"
                    >
                        <Bell size={18} />
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                    </button>
                </div>
            </header>

            <main className="mx-auto flex w-full max-w-md flex-1 min-h-0 flex-col overflow-hidden px-4 pt-4">
                {showSharedWelcome && (
                    <div className="pointer-events-none mb-3 shrink-0 animate-in slide-in-from-top-4 fade-in duration-500">
                        <div className="overflow-hidden rounded-3xl border border-emerald-100/70 bg-white/90 p-3 shadow-[0_16px_40px_rgba(96,133,92,0.16)] backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-[#60855c] shadow-sm">
                                    <Sparkles size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800">Espacio compartido listo</p>
                                    <p className="text-xs text-slate-500">Todo quedó sincronizado con {partnerDisplayName}.</p>
                                </div>
                            </div>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-50">
                                <div
                                    className="h-full rounded-full bg-linear-to-r from-[#60855c] to-sage transition-[width] ease-linear"
                                    style={{ width: `${welcomeProgress}%`, transitionDuration: "2400ms" }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <section
                    className={`mb-4 shrink-0 px-2 ${animateSharedEntrance ? "animate-in slide-in-from-left-3 fade-in duration-500" : ""}`}
                >
                    <h1 className="text-2xl font-semibold tracking-tight text-on-surface">{familyName}</h1>
                    <p className="text-sm font-normal opacity-70 text-on-surface-variant font-label">
                        Santuario compartido • Hoy
                    </p>
                </section>

                <section className="mb-2">
                    <div
                        className={`grid grid-cols-2 mb-6 shrink-0 rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden ${animateSharedEntrance ? "animate-in slide-in-from-bottom-4 fade-in duration-700" : ""}`}
                        style={animateSharedEntrance ? { animationDelay: "120ms" } : undefined}
                    >
                        {/* TARJETA 1: MI FONDO (ÍNDIGO) */}
                        <div className="relative flex flex-col justify-between min-h-41 bg-[#0f2d91]/40 p-4  border-slate-200/50">
                            {/* Capa de Textura de Ondas */}
                            <div className="absolute inset-0 z-0 opacity-60 mix-blend-multiply pointer-events-none bg-[url('/waves3.svg')] bg-cover bg-center" />

                            {/* Contenido Superior */}
                            <div className="relative z-10 flex flex-col">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-indigo-700 mb-2 backdrop-blur-sm shadow-sm">
                                    <User size={16} />
                                </div>
                                <span className="text-[10px] font-normal text-white uppercase tracking-widest">Mi Fondo</span>
                                <p className="mt-0.5 text-2xl font-semibold tracking-tight text-white">
                                    {formatCurrency(myAvailableFund)}
                                </p>
                                <p className="mt-0.5 text-[10px] font-medium text-indigo-700/80">
                                    {/* Gastado: {formatCurrency(mySpent)} */}
                                </p>
                            </div>

                            {/* Contenido Inferior (Botones) */}
                            <div className="relative z-10 mt-4">
                                <button
                                    type="button"
                                    onClick={openPersonalDepositModal}
                                    className="w-full rounded-full bg-white/90 py-2 text-xs font-bold text-indigo-700 transition-all hover:bg-white shadow-sm backdrop-blur-sm"
                                >
                                    Aportar
                                </button>
                            </div>
                        </div>

                        {/* TARJETA 2: FONDO COMÚN (VERDE SALVIA) */}
                        <div className="relative flex flex-col justify-between min-h-41 bg-[#5b8156]/50 p-4">
                            {/* Capa de Textura de Ondas */}
                            <div className="absolute inset-0 z-0 opacity-60 mix-blend-multiply pointer-events-none bg-[url('/waves3.svg')] bg-cover bg-center" />

                            {/* Contenido Superior */}
                            <div className="relative z-10 flex flex-col">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[#60855c] mb-2 backdrop-blur-sm shadow-sm ">
                                    {isJointModel ? <Home size={16} /> : <Scale size={16} />}
                                </div>
                                <span className="text-[10px] font-normal text-white uppercase tracking-widest">{secondaryWidgetTitle}</span>
                                <p className={`mt-0.5 text-2xl font-semibold tracking-tight ${secondaryWidgetValue < 0 ? 'text-red-600' : 'text-white'}`}>
                                    {secondaryWidgetValue < 0 ? '-' : ''}{formatCurrency(Math.abs(secondaryWidgetValue))}
                                </p>
                                {/* Espaciador invisible para igualar la altura con "Gastado: $X" de la tarjeta 1 */}
                                <p className="mt-0.5 text-[10px] font-medium opacity-0 select-none">
                                    Espaciador
                                </p>
                            </div>

                            {/* Contenido Inferior (Botones) */}
                            <div className="relative z-10 mt-4 flex gap-2">
                                {isJointModel ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={openDepositModal}
                                            className="w-full rounded-full bg-white/90 py-2 text-xs font-bold text-[#60855c] transition-all hover:bg-white shadow-sm backdrop-blur-sm"
                                        >
                                            Aportar
                                        </button>
                                        {fundOwesMe > 0 && (
                                            <button
                                                type="button"
                                                onClick={openBalancesModal}
                                                className="w-full rounded-full bg-red-50 py-2 text-xs font-bold text-orange-800 transition-all hover:bg-white shadow-sm border border-red-100"
                                            >
                                                Cobrar
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={openBalancesModal}
                                        disabled={!hasP2PBalance}
                                        className="w-full rounded-full bg-white/90 py-2 text-xs font-bold text-[#60855c] transition-all hover:bg-white shadow-sm backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Liquidar
                                    </button>
                                )}
                            </div>
                        </div>
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
                                                            <p className="text-sm font-medium text-slate-800">{expense.concept}</p>
                                                            <p className="text-[10px] text-slate-400">{formatExpenseDate(expense.expense_date)}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`font-medium ${isSelected ? 'text-[#60855c]' : 'text-slate-800'}`}>
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
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">Pagar a {partnerDisplayName}</h3>
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
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">Cobrar a {partnerDisplayName}</h3>
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

                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-baseline gap-3">
                            <h3 className="text-md font-semibold text-gray-800">Actividad</h3>
                            <Link
                                href="/history"
                                className="flex items-center text-[10px] font-bold tracking-widest text-[#60855c] opacity-70 hover:opacity-100 transition-opacity"
                            >
                                Ver todo <ChevronRight size={12} className="ml-0.5" />
                            </Link>
                        </div>
                        <button
                            type="button"
                            onClick={openFilterModal}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${currentFilter !== "all"
                                    ? "bg-[#60855c]/10 text-[#60855c]"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                        >
                            <SlidersHorizontal size={13} />
                            {currentFilter === "all" ? "Filtros" : filterLabels[currentFilter]}
                        </button>
                    </div>

                    <div
                        className={`flex-1 bg-white rounded-3xl shadow-sm flex flex-col overflow-hidden ${animateSharedEntrance ? "animate-in slide-in-from-bottom-5 fade-in duration-700" : ""}`}
                        style={animateSharedEntrance ? { animationDelay: "320ms" } : undefined}
                    >
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
                                <p className="max-w-55 text-xs leading-relaxed text-slate-400">
                                    Aún no hay movimientos aquí. Usa el botón verde para registrar tu primer gasto.
                                </p>
                            </div>
                        ) : (
                            <div className="flex h-full flex-col">
                {currentList.map((expense, index) => {
                                    console.log("Renderizando gasto:", expense); // Debug: Ver cada gasto que se renderiza
                                    const categoryPresentation = getExpenseCategoryPresentation(expense.category);
                                    const Icon = categoryPresentation.icon;
                                    const isDeposit = expense.category === "deposit";
                                    const isDebt = expense.paid_by !== expense.responsible_for && expense.category !== "deposit";
                                    const isModifiable =
                                        (!expense.is_settled || expense.category === 'deposit') &&
                                        expense.concept !== 'Reembolso del fondo' &&
                                        expense.concept !== 'Liquidación de deuda';

                                    return (
                                        <div
                                            key={expense.id}
                                            className={`relative flex items-stretch border-b border-slate-50 last:border-0 bg-white overflow-hidden group animate-in slide-in-from-left-8 fade-in duration-500 fill-mode-both ${currentList.length >= 5 ? 'flex-1' : ''
                                                }`}
                                            style={{ animationDelay: `${index * 75}ms` }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => toggleActions(expense.id)}
                                                className={`flex items-center justify-between px-4 transition-all duration-300 ease-out w-full text-left ${currentList.length >= 5 ? 'h-full' : 'py-4'
                                                    } ${activeActionId === expense.id ? 'scale-[1] bg-slate-50 pr-2 inset-shadow-zinc-700' : 'scale-100 bg-white'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-800/10 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0 shadow-sm">
                                                        <Icon size={18} />
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-slate-800">{expense.concept}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                                                                {formatExpenseDate(expense.expense_date || expense.created_at)} • {expense.paid_by === currentUserId ? 'TÚ' : partnerShortLabel}
                                                            </span>
                                                            {isDebt && (
                                                                <span className={`text-[8px] font-medium px-2 py-0.5 rounded uppercase tracking-widest ${expense.is_settled
                                                                    ? 'bg-emerald-50 text-emerald-600'
                                                                    : 'bg-orange-50 text-orange-600'
                                                                    }`}>
                                                                    {expense.is_settled ? 'Liquidado' : 'Pendiente'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <span className={`text-base font-medium shrink-0 ${isDeposit ? 'text-[#60855c]' : 'text-slate-800'}`}>
                                                    {isDeposit ? '+' : '-'}${Number(expense.amount).toFixed(2)}
                                                </span>
                                            </button>

                                            <div
                                                className={`flex flex-col border-l border-slate-100 transition-all duration-300 ease-out overflow-hidden shrink-0 ${activeActionId === expense.id ? (isModifiable ? 'w-14 opacity-100' : 'w-14 opacity-100') : 'w-0 opacity-0 border-transparent'
                                                    }`}
                                            >
                                                {isModifiable ? (
                                                    <>
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
                                            <span className="block text-[10px] font-bold uppercase tracking-wide text-[#bb1b1b]">Le debes a {partnerDisplayName}</span>
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
                                            <span className="block text-[10px] font-bold uppercase tracking-wide text-[#0f2d91]">{partnerDisplayName} te debe</span>
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


            {depositTarget && (
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
                                    {depositTarget === "personal" ? "APORTAR A MI FONDO" : "APORTAR AL FONDO COMÚN"}
                                </h4>
                            </div>

                            <CustomNumpad
                                isOpen={depositTarget !== null}
                                embedded
                                showDisplay
                                initialValue={depositAmount || "0"}
                                onClose={closeDepositModal}
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
            <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

            {/* Toast de notificación del sistema */}
            {systemNotification && (
                <div className="fixed top-6 left-1/2 z-200 -translate-x-1/2 animate-in slide-in-from-top-3 fade-in duration-300">
                    <div className="rounded-2xl bg-slate-800/95 px-5 py-3 text-sm font-medium text-white shadow-xl backdrop-blur-sm">
                        {systemNotification}
                    </div>
                </div>
            )}

            {/* Modal de confirmación de borrado */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={closeDeleteModal}
                    />
                    <div className="relative w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl transition-all animate-in zoom-in-95 fade-in duration-200">
                        {/* Icóno */}
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50">
                            <Trash2 size={24} className="text-rose-500" />
                        </div>
                        <h3 className="mb-1 text-base font-bold text-slate-800">Eliminar Movimiento</h3>
                        <p className="mb-6 text-sm text-slate-500">
                            ¿Estás seguro? Esta acción no se puede deshacer y ajustará los saldos.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                disabled={isDeleting}
                                className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="flex-1 rounded-xl bg-rose-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-600 disabled:opacity-70"
                            >
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

            {/* Modal de Filtros */}
            {showFilterModal && (
                <div className="fixed inset-0 z-60 flex flex-col justify-end">
                    <div
                        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isFilterAnimated ? "opacity-100" : "opacity-0"
                            }`}
                        onClick={closeFilterModal}
                    />
                    <div
                        className={`relative flex max-h-[80vh] flex-col rounded-t-[2.5rem] bg-white shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isFilterAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
                            }`}
                    >
                        <div className="flex justify-center pt-4 pb-2">
                            <div className="h-1.5 w-12 rounded-full bg-slate-200" />
                        </div>
                        <button
                            onClick={closeFilterModal}
                            className="absolute top-4 right-6 rounded-full bg-slate-50 p-2 text-slate-400 transition-colors hover:text-slate-600"
                        >
                            <X size={18} />
                        </button>
                        <div className="overflow-y-auto px-6 pb-8">
                            <h3 className="mb-5 text-lg font-bold text-slate-800">Filtrar Actividad</h3>
                            <div className="space-y-2">
                                {([
                                    { value: "all", label: "Todos los movimientos" },
                                    { value: "personal", label: "Mis gastos personales" },
                                    { value: "shared_all", label: "Fondo Común (todos)" },
                                    { value: "shared_me", label: "Fondo Común (pagados por mí)" },
                                    { value: "shared_partner", label: `Fondo Común (pagados por ${partnerDisplayName})` },
                                ] as { value: ActivityFilter; label: string }[]).map(({ value, label }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => {
                                            setCurrentFilter(value);
                                            closeFilterModal();
                                        }}
                                        className={`w-full rounded-2xl px-4 py-3.5 text-left text-sm transition-colors ${currentFilter === value
                                                ? "bg-[#60855c]/10 font-bold text-[#60855c]"
                                                : "bg-slate-50 font-medium text-slate-700 hover:bg-slate-100"
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const filterLabels: Record<Exclude<ActivityFilter, "all">, string> = {
    personal: "Personal",
    shared_all: "Fondo Común",
    shared_me: "Fondo (mí)",
    shared_partner: "Fondo (pareja)",
};
