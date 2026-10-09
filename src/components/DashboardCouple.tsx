"use client";

import Link from "next/link";
import { useMemo, useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
    BarChart3,
    Bell,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Crown,
    Edit,
    Eye,
    EyeOff,
    HandCoins,
    Home,
    House,
    Lock,
    Plus,
    Receipt,
    ReceiptText,
    Scale,
    Send,
    Settings,
    SlidersHorizontal,
    Sparkles,
    Trash2,
    User,
    Wallet,
    WalletCards,
    X,
    type LucideIcon,
} from "lucide-react";
import { settleDebt } from "@/app/actions/debt";
import { createDeposit, createPersonalDeposit, deleteExpenseAction } from "@/app/actions/expenses";
import { createFundAction, getFundsOverviewAction } from "@/app/actions/funds";
import { settleFundDebtAction } from "@/app/actions/settleFundDebt";
import { settleP2PAction } from "@/app/actions/settleP2P";
import { createClient } from "@/utils/supabase/client";
import { useExpenseModal } from "@/components/ExpenseModalProvider";
import {
    ExpenseDebtStatus,
    isFundSettlementConcept,
} from "@/components/ExpenseDebtStatus";
import ProfileDrawer from "@/components/ProfileDrawer";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { useExpenseStore } from "@/store/useExpenseStore";
import type { DashboardMember } from "@/lib/dashboard";
import type { ExpenseSplitType } from "@/lib/expenses";
import { getCategoryDetails } from "@/lib/categoryMap";
import {
    calculateFundCashBalance,
    calculateFundOwesUser,
    FUND_COLOR_OPTIONS,
    DEFAULT_PERSONAL_FUND_COLOR,
    DEFAULT_SHARED_FUND_COLOR,
    getDefaultSharedFund,
    isSharedLegacyResponsible,
    resolveFundColor,
    type FamilyFund,
} from "@/lib/funds";


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
    fund_id?: string | null;
    paid_from_fund?: boolean | null;
    transfer_group_id?: string | null;
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
    const rounded = Math.round((Number(value) || 0) * 100) / 100;
    const normalized = Object.is(rounded, -0) || Math.abs(rounded) < 0.005 ? 0 : rounded;
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
    }).format(normalized);
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
    const [settleScopeFundId, setSettleScopeFundId] = useState<string | "all" | null>(null);
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
    const isPremium = useExpenseStore((s) => s.isPremium);
    const [sharedFunds, setSharedFunds] = useState<FamilyFund[]>([]);
    const [selectedFundId, setSelectedFundId] = useState<string | null>(null);
    const [showFundsMenu, setShowFundsMenu] = useState(false);
    const [showCreateFundModal, setShowCreateFundModal] = useState(false);
    const [isCreateFundAnimated, setIsCreateFundAnimated] = useState(false);
    const [newFundName, setNewFundName] = useState("");
    const [newFundColor, setNewFundColor] = useState<string>(DEFAULT_SHARED_FUND_COLOR);
    const [fundActionError, setFundActionError] = useState("");
    const [isCreatingFund, startCreateFundTransition] = useTransition();
    const [balanceVisible, setBalanceVisible] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

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
    const openSettleModal = (scope: string | "all") => {
        setSettleScopeFundId(scope);
        setSelectedSettleIds([]);
        animateIn(setShowSettleModal, setIsSettleAnimated);
    };
    const closeSettleModal = () =>
        animateOut(setShowSettleModal, setIsSettleAnimated, () => {
            setSelectedSettleIds([]);
            setSettleScopeFundId(null);
        });
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
    const legacyFundLiquidity = fundIncome - fundDirectExpenses - fundWithdrawals;
    const fundSpent = Math.max(legacyFundLiquidity, 0);
    const fundBudget = Math.max(fundSpent, 1000);
    const isJointModel = financialModel === "joint_fund";
    const hasP2PBalance = iOwePartner > 0 || partnerOwesMe > 0;

    const selectedFund =
        sharedFunds.find((f) => f.id === selectedFundId) ??
        getDefaultSharedFund(sharedFunds) ??
        sharedFunds[0] ??
        null;

    const selectedFundBalance = useMemo(() => {
        if (!selectedFund) return legacyFundLiquidity;
        return calculateFundCashBalance(expenses, selectedFund.id, {
            treatLegacyJointAsFundId: getDefaultSharedFund(sharedFunds)?.id ?? null,
        });
    }, [expenses, legacyFundLiquidity, selectedFund, sharedFunds]);

    const secondaryWidgetHint = isJointModel
        ? ""
        : hasP2PBalance
            ? personalBalance >= 0
                ? "A tu favor"
                : "Por pagar"
            : "Sin deuda";

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const overview = await getFundsOverviewAction();
                if (cancelled) return;
                const shared = overview.funds.filter(
                    (f) => f.scope === "shared" && !f.archived_at
                );
                setSharedFunds(shared);
                setSelectedFundId((prev) => {
                    if (prev && shared.some((f) => f.id === prev)) return prev;
                    return overview.sharedDefaultFundId ?? shared[0]?.id ?? null;
                });
            } catch {
                // Migration/table may be unavailable; keep legacy green card.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const openCreateFundModal = () => {
        setFundActionError("");
        setNewFundName("");
        setNewFundColor(DEFAULT_SHARED_FUND_COLOR);
        setShowFundsMenu(false);
        animateIn(setShowCreateFundModal, setIsCreateFundAnimated);
    };
    const closeCreateFundModal = () =>
        animateOut(setShowCreateFundModal, setIsCreateFundAnimated, () => {
            setNewFundName("");
            setNewFundColor(DEFAULT_SHARED_FUND_COLOR);
            setFundActionError("");
        });

    const handleSelectFund = (fundId: string) => {
        setSelectedFundId(fundId);
        setShowFundsMenu(false);
    };

    const handleCreateFund = () => {
        const name = newFundName.trim();
        if (!name) {
            setFundActionError("Escribe un nombre para el fondo.");
            return;
        }
        setFundActionError("");
        startCreateFundTransition(async () => {
            try {
                const created = await createFundAction({
                    name,
                    scope: "shared",
                    color: newFundColor,
                });
                const overview = await getFundsOverviewAction();
                const shared = overview.funds.filter(
                    (f) => f.scope === "shared" && !f.archived_at
                );
                setSharedFunds(shared);
                setSelectedFundId(created.id);
                closeCreateFundModal();
                router.refresh();
            } catch (err) {
                setFundActionError(
                    err instanceof Error ? err.message : "No se pudo crear el fondo."
                );
            }
        });
    };


    const expenseBelongsToFund = (expense: CoupleDashboardExpense, fund: FamilyFund) => {
        if (expense.fund_id) return expense.fund_id === fund.id;
        return isSharedLegacyResponsible(expense.responsible_for) && fund.is_default;
    };

    const isRecoverableFundDebt = (expense: CoupleDashboardExpense) => {
        if ((expense.paid_by || expense.paidBy) !== currentUserId) return false;
        if (expense.is_settled) return false;
        if (expense.category === "deposit" || expense.category === "withdrawal") return false;
        if (expense.paid_from_fund) return false;
        return true;
    };

    // Deudas por cada bolsillo compartido
    const fundDebts = useMemo(
        () =>
            sharedFunds
                .map((fund) => {
                    const debtExpenses = expenses.filter(
                        (expense) =>
                            isRecoverableFundDebt(expense) && expenseBelongsToFund(expense, fund)
                    );
                    const amount = calculateFundOwesUser(expenses, fund, currentUserId);
                    return { fund, amount, expenses: debtExpenses };
                })
                .filter((row) => row.amount > 0.009 && row.expenses.length > 0),
        [currentUserId, expenses, sharedFunds]
    );

    const fundOwesMe = useMemo(
        () => fundDebts.reduce((sum, row) => sum + row.amount, 0),
        [fundDebts]
    );

    const settleScopeFund =
        settleScopeFundId && settleScopeFundId !== "all"
            ? sharedFunds.find((f) => f.id === settleScopeFundId) ?? null
            : null;

    // Lista de gastos a recuperar según el alcance (un bolsillo o todos)
    const fundDebtExpenses = useMemo(() => {
        if (settleScopeFundId === "all") {
            return fundDebts.flatMap((row) => row.expenses);
        }
        if (settleScopeFund) {
            return (
                fundDebts.find((row) => row.fund.id === settleScopeFund.id)?.expenses ?? []
            );
        }
        return [];
    }, [fundDebts, settleScopeFund, settleScopeFundId]);

    const resolveExpenseFund = (expense: CoupleDashboardExpense) =>
        sharedFunds.find((f) => expenseBelongsToFund(expense, f)) ??
        (isSharedLegacyResponsible(expense.responsible_for)
            ? getDefaultSharedFund(sharedFunds)
            : null);

    const hasBalances = fundOwesMe > 0 || iOwePartner > 0 || partnerOwesMe > 0;

    // Filtrar gastos de sistema (withdrawal, transfer y registros internos de liquidación)
    const activityExpenses = useMemo(
        () =>
            expenses.filter(
                (expense) =>
                    expense.category !== "withdrawal" &&
                    expense.category !== "transfer" &&
                    expense.concept !== "Reembolso del fondo" &&
                    !isFundSettlementConcept(expense.concept)
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
                await createDeposit({
                    amount: normalizedAmount,
                    fundId: selectedFundId ?? undefined,
                });
            }

            setDepositAmount("");
            closeDepositModal();
            router.refresh();
        });
    }

    function handleLiquidate() {
        openSettleModal(selectedFund?.id ?? "all");
    }

    function handleSettleFundDebt(selectedIds: string[], selectedTotal: number) {
        if (selectedIds.length === 0 || selectedTotal <= 0) return;

        const selectedExpenses = fundDebtExpenses.filter((e) => selectedIds.includes(e.id));
        const groups = new Map<string, { expenseIds: string[]; total: number }>();

        for (const expense of selectedExpenses) {
            const fund = resolveExpenseFund(expense);
            if (!fund) continue;
            const current = groups.get(fund.id) ?? { expenseIds: [], total: 0 };
            current.expenseIds.push(expense.id);
            current.total += Number(expense.amount || 0);
            groups.set(fund.id, current);
        }

        if (groups.size === 0) return;

        startLiquidatingTransition(async () => {
            for (const [fundId, group] of groups) {
                await settleFundDebtAction({
                    expenseIds: group.expenseIds,
                    totalAmount: Math.round(group.total * 100) / 100,
                    currentUserId,
                    familyId,
                    fundId,
                });
            }
            closeSettleModal();
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

    const heroBalance = isJointModel ? selectedFundBalance : personalBalance;
    const heroLabel = isJointModel
        ? selectedFund?.name ?? "Bolsillo"
        : "Balance P2P";
    const heroColor = isJointModel
        ? resolveFundColor(selectedFund)
        : "#0F2D91";
    const currentMember =
        members.find((member) => member.id === currentUserId) ?? members[0] ?? null;

    return (
        <div className="relative flex h-dvh flex-col overflow-hidden bg-linear-to-b from-[#f3f5f0] via-[#e8ede4] to-[#d5dfd0]">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(ellipse_at_bottom,_rgba(74,101,73,0.16),_transparent_70%)]" />

            <header className="relative z-50 flex w-full shrink-0 items-center justify-between px-4 pb-1.5 pt-3">
                <button
                    type="button"
                    onClick={() => setIsProfileOpen(true)}
                    className="flex min-w-0 items-center gap-2.5 text-left"
                >
                    <div className="h-9 w-9 overflow-hidden rounded-full border border-outline-variant/30 bg-surface-lowest shadow-sm">
                        {currentMember?.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                className="h-full w-full object-cover"
                                src={currentMember.avatarUrl}
                                alt={currentUserName}
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-primary-container text-xs font-medium text-on-primary-container">
                                {getInitials(currentUserName)}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-light text-on-surface-variant">
                            Hola de nuevo · {familyName}
                        </p>
                        <p className="truncate text-[15px] font-medium tracking-tight text-on-surface">
                            {getFirstName(currentUserName, "Tú")}
                        </p>
                    </div>
                </button>
                <div className="flex items-center gap-1.5">
                    {isPremium ? (
                        <div className="flex items-center rounded-full border border-accent/25 bg-accent/15 px-1.5 py-1 shadow-sm">
                            <Crown size={12} className="fill-accent text-accent" />
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="rounded-full border border-outline-variant/40 bg-surface-lowest/80 p-1.5 text-outline-variant shadow-sm backdrop-blur-sm"
                            aria-label="Hazte Premium"
                        >
                            <Lock size={13} strokeWidth={2} />
                        </button>
                    )}
                    <button
                        type="button"
                        className="relative rounded-full border border-outline-variant/30 bg-surface-lowest/80 p-2 text-on-surface-variant shadow-sm backdrop-blur-sm"
                        aria-label="Notificaciones"
                    >
                        <Bell size={16} />
                        <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white" />
                    </button>
                </div>
            </header>

            <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 min-h-0 flex-col overflow-hidden px-4 pt-1">
                {showSharedWelcome && (
                    <div className="pointer-events-none mb-3 shrink-0 animate-in slide-in-from-top-4 fade-in duration-500">
                        <div className="overflow-hidden rounded-3xl border border-emerald-100/70 bg-surface-lowest/90 p-3 shadow-[0_16px_40px_rgba(96,133,92,0.16)] backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-primary shadow-sm">
                                    <Sparkles size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-on-surface">Espacio compartido listo</p>
                                    <p className="text-xs text-on-surface-variant">Todo quedó sincronizado con {partnerDisplayName}.</p>
                                </div>
                            </div>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-50">
                                <div
                                    className="h-full rounded-full bg-linear-to-r from-primary to-primary-container transition-[width] ease-linear"
                                    style={{ width: `${welcomeProgress}%`, transitionDuration: "2400ms" }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <section
                    className={`relative mb-3 shrink-0 ${animateSharedEntrance ? "animate-in slide-in-from-bottom-4 fade-in duration-700" : ""}`}
                    style={animateSharedEntrance ? { animationDelay: "80ms" } : undefined}
                >
                    <div
                        className="relative overflow-hidden rounded-[1.85rem] p-6 shadow-[0_14px_40px_rgba(43,52,55,0.12)] backdrop-blur-2xl transition-[background] duration-500"
                        style={{
                            backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.72) 0%, ${heroColor}18 55%, ${heroColor}28 100%)`,
                        }}
                    >
                        <div className="relative z-10 flex min-w-0 items-center gap-3">
                            <div
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                                style={{ backgroundColor: `${heroColor}28`, color: heroColor }}
                            >
                                <Wallet size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-light text-on-surface-variant">
                                    Saldo disponible
                                </p>
                                <p className="truncate text-base font-medium text-on-surface">
                                    {heroLabel}
                                </p>
                            </div>
                        </div>

                        <div className="relative z-10 mt-4 flex items-center gap-2.5">
                            <p
                                className={`text-[2.65rem] font-light leading-none tracking-tight ${
                                    Math.round((heroBalance || 0) * 100) / 100 < 0
                                        ? "text-red-600"
                                        : "text-on-surface"
                                }`}
                            >
                                {balanceVisible ? formatCurrency(heroBalance) : "••••••"}
                            </p>
                            <button
                                type="button"
                                onClick={() => setBalanceVisible((v) => !v)}
                                className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-white/40"
                                aria-label={balanceVisible ? "Ocultar saldo" : "Mostrar saldo"}
                            >
                                {balanceVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>

                        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={openPersonalDepositModal}
                                className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container"
                            >
                                <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: "#0F2D91" }}
                                />
                                Mi fondo · {balanceVisible ? formatCurrency(myAvailableFund) : "••••"}
                            </button>
                            {isJointModel && fundOwesMe > 0 && (
                                <button
                                    type="button"
                                    onClick={openBalancesModal}
                                    className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700"
                                >
                                    Cobrar {formatCurrency(fundOwesMe)}
                                    <ChevronRight size={12} />
                                </button>
                            )}
                            {!isJointModel && hasP2PBalance && (
                                <button
                                    type="button"
                                    onClick={openBalancesModal}
                                    className="inline-flex items-center gap-1 rounded-full bg-surface-low px-3 py-1.5 text-xs font-medium text-on-surface"
                                >
                                    {secondaryWidgetHint || "Saldos"}
                                    <ChevronRight size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <section
                    className={`relative mb-3 shrink-0 ${animateSharedEntrance ? "animate-in fade-in slide-in-from-bottom-3 duration-700" : ""}`}
                    style={animateSharedEntrance ? { animationDelay: "160ms" } : undefined}
                >
                    <h2 className="mb-2 px-1 text-xs font-medium text-on-surface">Acciones rápidas</h2>
                    <div className="grid grid-cols-4 gap-1.5">
                        {[
                            {
                                key: "expense",
                                label: "Gasto",
                                icon: Plus,
                                onClick: () => {
                                    setExpenseToEdit(null);
                                    setIsExpenseModalOpen(true);
                                },
                                darkFab: true,
                            },
                            {
                                key: "shared",
                                label: isJointModel ? "Aportar" : "Liquidar",
                                icon: isJointModel ? Send : Scale,
                                onClick: isJointModel ? openDepositModal : openBalancesModal,
                            },
                            {
                                key: "collect",
                                label: fundOwesMe > 0 || hasP2PBalance ? "Cobrar" : "Saldos",
                                icon: HandCoins,
                                onClick: openBalancesModal,
                            },
                            {
                                key: "funds",
                                label: isJointModel ? "Fondos" : "Filtros",
                                icon: isJointModel ? WalletCards : SlidersHorizontal,
                                onClick: isJointModel
                                    ? () => setShowFundsMenu((open) => !open)
                                    : openFilterModal,
                            },
                        ].map(({ key, label, icon: Icon, onClick, darkFab }) => {
                            const isAportar = key === "shared" && isJointModel;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={onClick}
                                    className="flex flex-col items-center gap-1.5 rounded-xl px-0.5 py-0.5 transition-transform active:scale-95"
                                >
                                    <span
                                        className={`flex h-11 w-11 items-center justify-center rounded-full shadow-[0_6px_14px_rgba(43,52,55,0.06)] backdrop-blur-md transition-[background] duration-500 ${
                                            darkFab || isAportar
                                                ? ""
                                                : "border border-outline-variant/25 bg-surface-lowest/80 text-on-surface"
                                        }`}
                                        style={
                                            darkFab
                                                ? {
                                                      backgroundImage:
                                                          "linear-gradient(145deg, #4a5558 0%, #2b3437 52%, #1a2224 100%)",
                                                      color: "#f3f5f0",
                                                      boxShadow: "0 10px 22px rgba(43,52,55,0.32)",
                                                  }
                                                : isAportar
                                                  ? {
                                                        backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.72) 0%, ${heroColor}18 55%, ${heroColor}28 100%)`,
                                                        color: heroColor,
                                                        borderColor: heroColor,
                                                    }
                                                  : undefined
                                        }
                                    >
                                        <Icon size={17} strokeWidth={darkFab ? 2.2 : 1.7} />
                                    </span>
                                    <span className="text-[10px] font-medium text-on-surface">{label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {isJointModel && showFundsMenu && (
                        <>
                            <button
                                type="button"
                                aria-label="Cerrar lista de fondos"
                                className="fixed inset-0 z-40 cursor-default"
                                onClick={() => setShowFundsMenu(false)}
                            />
                            <div className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-lowest shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="max-h-64 overflow-y-auto p-2">
                                    {sharedFunds.length === 0 ? (
                                        <p className="px-3 py-2 text-xs text-on-surface-variant">
                                            Aún no hay fondos.
                                        </p>
                                    ) : (
                                        sharedFunds.map((fund) => {
                                            const balance = calculateFundCashBalance(
                                                expenses,
                                                fund.id,
                                                {
                                                    treatLegacyJointAsFundId:
                                                        getDefaultSharedFund(sharedFunds)?.id ?? null,
                                                }
                                            );
                                            const isActive = selectedFund?.id === fund.id;
                                            return (
                                                <button
                                                    key={fund.id}
                                                    type="button"
                                                    onClick={() => handleSelectFund(fund.id)}
                                                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${
                                                        isActive
                                                            ? "bg-primary/10 text-primary"
                                                            : "text-on-surface hover:bg-surface"
                                                    }`}
                                                >
                                                    <span className="flex min-w-0 items-center gap-2">
                                                        <span
                                                            className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
                                                            style={{
                                                                backgroundColor: resolveFundColor(fund),
                                                            }}
                                                        />
                                                        <span className="truncate text-sm font-semibold">
                                                            {fund.name}
                                                        </span>
                                                    </span>
                                                    <span className="shrink-0 text-xs font-medium opacity-80">
                                                        {formatCurrency(balance)}
                                                    </span>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                                <div className="border-t border-outline-variant/20 p-2">
                                    <button
                                        type="button"
                                        onClick={openCreateFundModal}
                                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-on-primary"
                                    >
                                        <Plus size={16} />
                                        Crear fondo
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </section>

                    {/* Modal de Liquidación: SIEMPRE FUERA DEL STACKING CONTEXT */}
                    {showSettleModal && (
                        <div className="fixed inset-0 z-60 flex flex-col justify-end">
                            <div className={`absolute inset-0 bg-on-surface/95/60 backdrop-blur-sm transition-opacity duration-300 ${isSettleAnimated ? "opacity-100" : "opacity-0"}`} onClick={closeSettleModal} />
                            <div className={`relative flex max-h-[90vh] flex-col rounded-t-[2.5rem] bg-surface-lowest shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSettleAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
                                <div className="flex justify-center pt-4 pb-2">
                                    <div className="h-1.5 w-12 rounded-full bg-surface-container" />
                                </div>
                                <button
                                    onClick={closeSettleModal}
                                    className="absolute top-4 right-6 rounded-full bg-surface p-2 text-outline-variant transition-colors hover:text-on-surface-variant"
                                >
                                    <X size={18} />
                                </button>
                                <div className="hide-scrollbar overflow-y-auto px-6 pb-8">
                                    <h3 className="mb-1 text-lg font-bold text-on-surface">
                                        {settleScopeFundId === "all"
                                            ? "Cobrar a bolsillos"
                                            : `Cobrar a ${settleScopeFund?.name ?? "Fondo"}`}
                                    </h3>
                                    <p className="mb-4 text-xs text-on-surface-variant">
                                        {settleScopeFundId === "all"
                                            ? "Selecciona gastos de uno o varios bolsillos."
                                            : "Selecciona los gastos que vas a recuperar de este bolsillo."}
                                    </p>
                                    {/* Lista seleccionable */}
                                    <div className="mb-6 max-h-[40vh] space-y-3 overflow-y-auto pr-2">
                                        {fundDebtExpenses.map((expense) => {
                                            const isSelected = selectedSettleIds.includes(expense.id);
                                            const expenseFund = resolveExpenseFund(expense);
                                            return (
                                                <button
                                                    key={expense.id}
                                                    type="button"
                                                    onClick={() => toggleSettleSelection(expense.id)}
                                                    className={`flex w-full items-center justify-between rounded-2xl border p-4 transition-all duration-500 ${
                                                        isSelected
                                                            ? "border-primary bg-primary/5"
                                                            : "border-outline-variant/20 bg-surface-lowest"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                                                                isSelected
                                                                    ? "border-primary bg-primary"
                                                                    : "border-outline-variant/40"
                                                            }`}
                                                        >
                                                            {isSelected && (
                                                                <Check size={12} className="text-white" />
                                                            )}
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-sm font-medium text-on-surface">
                                                                {expense.concept}
                                                            </p>
                                                            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-outline-variant">
                                                                {formatExpenseDate(expense.expense_date)}
                                                                {settleScopeFundId === "all" && expenseFund && (
                                                                    <>
                                                                        <span>·</span>
                                                                        <span
                                                                            className="inline-flex items-center gap-1 font-semibold text-on-surface-variant"
                                                                        >
                                                                            <span
                                                                                className="h-2 w-2 rounded-full"
                                                                                style={{
                                                                                    backgroundColor:
                                                                                        resolveFundColor(expenseFund),
                                                                                }}
                                                                            />
                                                                            {expenseFund.name}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span
                                                        className={`font-medium ${
                                                            isSelected ? "text-primary" : "text-on-surface"
                                                        }`}
                                                    >
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
                                                    ? 'bg-surface-low text-outline-variant cursor-not-allowed'
                                                    : 'bg-primary text-white'
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
                            <div className={`absolute inset-0 bg-on-surface/95/60 backdrop-blur-sm transition-opacity duration-300 ${isPayAnimated ? "opacity-100" : "opacity-0"}`} onClick={closePayModal} />
                            <div className={`relative flex max-h-[90vh] flex-col rounded-t-[2.5rem] bg-surface-lowest shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isPayAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
                                <div className="flex justify-center pt-4 pb-2">
                                    <div className="h-1.5 w-12 rounded-full bg-surface-container" />
                                </div>
                                <button
                                    onClick={closePayModal}
                                    className="absolute top-4 right-6 rounded-full bg-surface p-2 text-outline-variant transition-colors hover:text-on-surface-variant"
                                >
                                    <X size={18} />
                                </button>
                                <div className="hide-scrollbar overflow-y-auto px-6 pb-8">
                                    <h3 className="text-lg font-bold text-on-surface mb-1">Pagar a {partnerDisplayName}</h3>
                                    <p className="text-xs text-on-surface-variant mb-4">Selecciona los gastos que vas a liquidar.</p>
                                    {/* Lista seleccionable */}
                                    <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                                        {expensesIOwePartner.map(expense => {
                                            const isSelected = selectedSettleIds.includes(expense.id);
                                            return (
                                                <button
                                                    key={expense.id}
                                                    onClick={() => toggleSettleSelection(expense.id)}
                                                    className={`w-full flex justify-between items-center p-4 border rounded-2xl transition-all duration-500 ${isSelected ? 'border-[#bb1b1b] bg-[#bb1b1b]/5' : 'border-outline-variant/20 bg-surface-lowest'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {/* Custom Checkbox */}
                                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'border-[#bb1b1b] bg-[#bb1b1b]' : 'border-outline-variant/40'
                                                            }`}>
                                                            {isSelected && <Check size={12} className="text-white" />}
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-sm font-bold text-on-surface">{expense.concept}</p>
                                                            <p className="text-[10px] text-outline-variant">{formatExpenseDate(expense.expense_date)}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`font-bold ${isSelected ? 'text-[#bb1b1b]' : 'text-on-surface'}`}>
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
                                                    ? 'bg-surface-low text-outline-variant cursor-not-allowed'
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
                            <div className={`absolute inset-0 bg-on-surface/95/60 backdrop-blur-sm transition-opacity duration-300 ${isChargeAnimated ? "opacity-100" : "opacity-0"}`} onClick={closeChargeModal} />
                            <div className={`relative flex max-h-[90vh] flex-col rounded-t-[2.5rem] bg-surface-lowest shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isChargeAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
                                <div className="flex justify-center pt-4 pb-2">
                                    <div className="h-1.5 w-12 rounded-full bg-surface-container" />
                                </div>
                                <button
                                    onClick={closeChargeModal}
                                    className="absolute top-4 right-6 rounded-full bg-surface p-2 text-outline-variant transition-colors hover:text-on-surface-variant"
                                >
                                    <X size={18} />
                                </button>
                                <div className="hide-scrollbar overflow-y-auto px-6 pb-8">
                                    <h3 className="text-lg font-bold text-on-surface mb-1">Cobrar a {partnerDisplayName}</h3>
                                    <p className="text-xs text-on-surface-variant mb-4">Selecciona los gastos que vas a marcar como pagados.</p>
                                    {/* Lista seleccionable */}
                                    <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                                        {expensesPartnerOwesMe.map(expense => {
                                            const isSelected = selectedSettleIds.includes(expense.id);
                                            return (
                                                <button
                                                    key={expense.id}
                                                    onClick={() => toggleSettleSelection(expense.id)}
                                                    className={`w-full flex justify-between items-center p-4 border rounded-2xl transition-all duration-500 ${isSelected ? 'border-[#0f2d91] bg-[#0f2d91]/5' : 'border-outline-variant/20 bg-surface-lowest'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {/* Custom Checkbox */}
                                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'border-[#0f2d91] bg-[#0f2d91]' : 'border-outline-variant/40'
                                                            }`}>
                                                            {isSelected && <Check size={12} className="text-white" />}
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="text-sm font-bold text-on-surface">{expense.concept}</p>
                                                            <p className="text-[10px] text-outline-variant">{formatExpenseDate(expense.expense_date)}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`font-bold ${isSelected ? 'text-[#0f2d91]' : 'text-on-surface'}`}>
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
                                                    ? 'bg-surface-low text-outline-variant cursor-not-allowed'
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

                <div className="mb-24 flex min-h-0 flex-1 flex-col">
                    <div className="mb-2 flex items-center justify-between px-1">
                        <div className="flex items-baseline gap-2.5">
                            <h3 className="text-xs font-medium text-on-surface">Movimientos recientes</h3>
                            <Link
                                href="/history"
                                className="text-[11px] font-light text-on-surface-variant transition-colors hover:text-on-surface"
                            >
                                Ver todo
                            </Link>
                        </div>
                        <button
                            type="button"
                            onClick={openFilterModal}
                            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${currentFilter !== "all"
                                    ? "bg-primary/10 text-primary"
                                    : "bg-surface-lowest/80 text-on-surface-variant shadow-sm backdrop-blur-sm"
                                }`}
                        >
                            <SlidersHorizontal size={12} />
                            {currentFilter === "all" ? "Filtros" : filterLabels[currentFilter]}
                        </button>
                    </div>

                    <div
                        className={`flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/60 bg-surface-lowest/40 shadow-[0_10px_24px_rgba(43,52,55,0.06)] backdrop-blur-2xl ${animateSharedEntrance ? "animate-in slide-in-from-bottom-5 fade-in duration-700" : ""}`}
                        style={animateSharedEntrance ? { animationDelay: "240ms" } : undefined}
                    >
                        {currentList.length === 0 ? (
                            <div className="flex h-full flex-1 flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
                                <div className="relative mb-4 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full bg-primary opacity-10 animate-ping duration-1000" />
                                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-emerald-100/50 bg-white/50 text-primary shadow-sm backdrop-blur-md">
                                        <Receipt size={28} strokeWidth={1.5} />
                                    </div>
                                </div>

                                <h4 className="mb-1 text-base font-medium text-on-surface">Todo está tranquilo</h4>
                                <p className="max-w-55 text-xs leading-relaxed text-outline-variant">
                                    Aún no hay movimientos aquí. Usa el botón + para registrar tu primer gasto.
                                </p>
                            </div>
                        ) : (
                            <div className="flex h-full min-h-0 flex-1 flex-col">
                                {currentList.map((expense, index) => {
                                    const categoryPresentation = getExpenseCategoryPresentation(expense.category);
                                    const Icon = categoryPresentation.icon;
                                    const isDeposit = expense.category === "deposit";
                                    const isDebt = expense.paid_by !== expense.responsible_for && expense.category !== "deposit";
                                    const isModifiable =
                                        (!expense.is_settled || expense.category === 'deposit') &&
                                        expense.concept !== 'Reembolso del fondo' &&
                                        !isFundSettlementConcept(expense.concept);
                                    const expenseFund =
                                        sharedFunds.find((f) => f.id === expense.fund_id) ??
                                        (isSharedLegacyResponsible(expense.responsible_for)
                                            ? getDefaultSharedFund(sharedFunds)
                                            : null);
                                    const iconColor = expenseFund
                                        ? resolveFundColor(expenseFund)
                                        : DEFAULT_PERSONAL_FUND_COLOR;

                                    return (
                                        <div
                                            key={expense.id}
                                            className="group relative flex min-h-0 flex-1 items-stretch overflow-hidden border-b border-white/40 last:border-0 animate-in slide-in-from-left-8 fade-in duration-500 fill-mode-both"
                                            style={{ animationDelay: `${index * 60}ms` }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => toggleActions(expense.id)}
                                                className={`flex h-full w-full items-center justify-between gap-2.5 px-3.5 text-left transition-colors duration-200 ${
                                                    activeActionId === expense.id ? "bg-white/40 pr-2" : "bg-transparent"
                                                }`}
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div
                                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm backdrop-blur-md"
                                                        style={{
                                                            backgroundColor: `${iconColor}18`,
                                                            borderColor: `${iconColor}35`,
                                                            color: iconColor,
                                                        }}
                                                        title={expenseFund?.name ?? "Mi fondo"}
                                                    >
                                                        <Icon size={15} />
                                                    </div>

                                                    <div className="flex min-w-0 flex-col justify-center gap-0.5">
                                                        <span className="truncate text-[15px] font-medium leading-tight text-on-surface">
                                                            {expense.concept}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] font-medium uppercase tracking-wide text-outline-variant">
                                                                {formatExpenseDate(expense.expense_date || expense.created_at)} · {expense.paid_by === currentUserId ? "TÚ" : partnerShortLabel}
                                                            </span>
                                                            {isDebt && (
                                                                <ExpenseDebtStatus isSettled={!!expense.is_settled} />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <span className={`shrink-0 text-[15px] font-medium ${isDeposit ? "text-primary" : "text-on-surface"}`}>
                                                    {isDeposit ? "+" : "-"}${Number(expense.amount).toFixed(2)}
                                                </span>
                                            </button>

                                            <div
                                                className={`flex flex-col border-l border-outline-variant/20 transition-all duration-300 ease-out overflow-hidden shrink-0 ${activeActionId === expense.id ? (isModifiable ? 'w-14 opacity-100' : 'w-14 opacity-100') : 'w-0 opacity-0 border-transparent'
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
                                                            className="flex-1 flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-secondary/10 bg-surface/50 transition-colors border-b border-outline-variant/20"
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
                                                        className="flex-1 flex items-center justify-center text-outline-variant bg-surface-low transition-colors"
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
                    <div className={`absolute inset-0 bg-on-surface/95/60 backdrop-blur-sm transition-opacity duration-300 ${isBudgetAnimated ? "opacity-100" : "opacity-0"}`} onClick={closeBudgetModal} />
                    <div className={`relative flex max-h-[90vh] flex-col rounded-t-[2.5rem] bg-surface-lowest shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isBudgetAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
                        <div className="flex justify-center pt-4 pb-2">
                            <div className="h-1.5 w-12 rounded-full bg-surface-container" />
                        </div>
                        <button type="button" onClick={closeBudgetModal} className="absolute top-4 right-6 rounded-full bg-surface p-2 text-outline-variant transition-colors hover:text-on-surface-variant">
                            <X size={18} />
                        </button>
                        <div className="hide-scrollbar overflow-y-auto px-6 pb-8">
                            <div className="mb-5 flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-bold text-on-surface">Control de Presupuesto</h3>
                                    <p className="text-xs text-on-surface-variant">Estado actual de tus bolsillos y del fondo común.</p>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-lowest divide-y divide-outline-variant/20">
                                <div className="p-4">
                                    <div className="mb-2 flex items-end justify-between">
                                        <div>
                                            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Mi Bolsillo</span>
                                            <span className="text-base font-bold text-on-surface">${mySpent.toFixed(2)}</span>
                                        </div>
                                        <span className="text-[11px] font-medium text-outline-variant">de ${myBudget}</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-surface-low">
                                        <div className="h-1.5 rounded-full bg-on-surface/95" style={{ width: `${Math.min((mySpent / myBudget) * 100, 100)}%` }} />
                                    </div>
                                </div>

                                <div className="p-4">
                                    <div className="mb-2 flex items-end justify-between">
                                        <div>
                                            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-primary">Fondo Común</span>
                                            <span className="text-base font-bold text-on-surface">${fundSpent.toFixed(2)}</span>
                                        </div>
                                        <span className="text-[11px] font-medium text-outline-variant">de ${fundBudget}</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-surface-low">
                                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min((fundSpent / fundBudget) * 100, 100)}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {mounted &&
                showBalances &&
                createPortal(
                    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                        <div
                            className={`absolute inset-0 bg-on-surface/50 backdrop-blur-sm transition-opacity duration-300 ${
                                isBalancesAnimated ? "opacity-100" : "opacity-0"
                            }`}
                            onClick={() => closeBalancesModal()}
                        />
                        <div
                            className={`relative flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[2rem] bg-linear-to-b from-[#f7f8f5] to-[#eef1eb] shadow-[0_-16px_48px_rgba(43,52,55,0.18)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                isBalancesAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
                            }`}
                        >
                            <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-outline-variant/40" />

                            <div className="relative flex shrink-0 items-start justify-between gap-3 px-5 pb-2 pt-3">
                                <div className="min-w-0 pr-10">
                                    <h3 className="text-base font-medium tracking-tight text-on-surface">
                                        Saldos pendientes
                                    </h3>
                                    <p className="mt-0.5 text-xs text-on-surface-variant">
                                        Cobra o paga lo que tengas pendiente.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => closeBalancesModal()}
                                    className="absolute right-4 top-2 flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/25 bg-white/70 text-on-surface-variant shadow-sm backdrop-blur-sm transition-colors hover:bg-white"
                                    aria-label="Cerrar"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
                                <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/55 shadow-[0_8px_20px_rgba(43,52,55,0.06)] backdrop-blur-md divide-y divide-outline-variant/15">
                                    {fundDebts.map(({ fund, amount }) => {
                                        const fundColor = resolveFundColor(fund);
                                        return (
                                            <div key={fund.id} className="flex items-center justify-between gap-3 px-3.5 py-3">
                                                <div className="min-w-0">
                                                    <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
                                                        <span
                                                            className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10"
                                                            style={{ backgroundColor: fundColor }}
                                                        />
                                                        {fund.name} te debe
                                                    </span>
                                                    <span className="text-[15px] font-medium text-on-surface">
                                                        ${amount.toFixed(2)}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        closeBalancesModal(() => openSettleModal(fund.id));
                                                    }}
                                                    disabled={isLiquidating}
                                                    className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                                                    style={{ backgroundColor: fundColor }}
                                                >
                                                    Cobrar
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {fundDebts.length > 1 && (
                                        <div className="flex items-center justify-between gap-3 bg-primary/8 px-3.5 py-3">
                                            <div>
                                                <span className="block text-[10px] font-medium uppercase tracking-wide text-primary">
                                                    Total bolsillos
                                                </span>
                                                <span className="text-[15px] font-medium text-on-surface">
                                                    ${fundOwesMe.toFixed(2)}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    closeBalancesModal(() => openSettleModal("all"));
                                                }}
                                                disabled={isLiquidating}
                                                className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-[10px] font-semibold text-on-primary shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Cobrar todo
                                            </button>
                                        </div>
                                    )}

                                    {iOwePartner > 0 && (
                                        <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                                            <div>
                                                <span className="block text-[10px] font-medium uppercase tracking-wide text-[#bb1b1b]">
                                                    Le debes a {partnerDisplayName}
                                                </span>
                                                <span className="text-[15px] font-medium text-on-surface">
                                                    ${iOwePartner.toFixed(2)}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    closeBalancesModal(() => openPayModal());
                                                }}
                                                disabled={isLiquidating}
                                                className="rounded-full bg-[#bb1b1b] px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Pagar
                                            </button>
                                        </div>
                                    )}

                                    {partnerOwesMe > 0 && (
                                        <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                                            <div>
                                                <span className="block text-[10px] font-medium uppercase tracking-wide text-[#0f2d91]">
                                                    {partnerDisplayName} te debe
                                                </span>
                                                <span className="text-[15px] font-medium text-on-surface">
                                                    ${partnerOwesMe.toFixed(2)}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    closeBalancesModal(() => openChargeModal());
                                                }}
                                                disabled={isLiquidating}
                                                className="rounded-full bg-[#0f2d91] px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Cobrar
                                            </button>
                                        </div>
                                    )}

                                    {!hasBalances && (
                                        <div className="px-3.5 py-4 text-sm font-medium text-on-surface-variant">
                                            No hay saldos pendientes por ahora.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}


            {showCreateFundModal && (
                <div className="fixed inset-0 z-70 flex items-end justify-center sm:items-center">
                    <div
                        className={`absolute inset-0 bg-on-surface/60 backdrop-blur-sm transition-opacity duration-300 ${
                            isCreateFundAnimated ? "opacity-100" : "opacity-0"
                        }`}
                        onClick={closeCreateFundModal}
                    />
                    <div
                        className={`relative m-4 w-full max-w-sm rounded-3xl bg-surface-lowest p-6 shadow-2xl transition-all duration-300 ${
                            isCreateFundAnimated
                                ? "translate-y-0 opacity-100"
                                : "translate-y-6 opacity-0"
                        }`}
                    >
                        <button
                            type="button"
                            onClick={closeCreateFundModal}
                            className="absolute right-4 top-4 rounded-full bg-surface p-2 text-outline-variant"
                            aria-label="Cerrar"
                        >
                            <X size={16} />
                        </button>
                        <h3 className="pr-8 text-lg font-bold text-on-surface">Crear fondo</h3>
                        <p className="mt-1 text-xs text-on-surface-variant">
                            Elige nombre y color para el bolsillo.
                        </p>
                        <label className="mt-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            Nombre
                        </label>
                        <input
                            autoFocus
                            value={newFundName}
                            onChange={(e) => setNewFundName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreateFund();
                            }}
                            placeholder="Ej. Gasolina, Restaurantes..."
                            className="mt-1.5 w-full rounded-2xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/25"
                        />
                        <label className="mt-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            Color
                        </label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {FUND_COLOR_OPTIONS.map((option) => {
                                const isSelected = newFundColor === option.value;
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setNewFundColor(option.value)}
                                        title={option.label}
                                        aria-label={option.label}
                                        className={`h-9 w-9 rounded-full transition-transform ${
                                            isSelected
                                                ? "scale-110 ring-2 ring-offset-2 ring-on-surface"
                                                : "hover:scale-105"
                                        }`}
                                        style={{ backgroundColor: option.value }}
                                    />
                                );
                            })}
                        </div>
                        <div
                            className="mt-4 overflow-hidden rounded-2xl p-4 text-white shadow-sm"
                            style={{ backgroundColor: newFundColor }}
                        >
                            <p className="text-[10px] font-normal uppercase tracking-widest opacity-90">
                                Vista previa
                            </p>
                            <p className="mt-1 text-lg font-semibold tracking-tight">
                                {newFundName.trim() || "Nuevo fondo"}
                            </p>
                        </div>
                        {fundActionError && (
                            <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                                {fundActionError}
                            </p>
                        )}
                        <button
                            type="button"
                            disabled={isCreatingFund}
                            onClick={handleCreateFund}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-semibold text-on-primary disabled:opacity-60"
                        >
                            {isCreatingFund ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </div>
            )}

            <NumericKeypadSheet
                isOpen={Boolean(depositTarget)}
                title={depositTarget === "personal" ? "Aportar a mi fondo" : "Aportar al bolsillo"}
                subtitle={
                    depositTarget === "personal"
                        ? "Mi fondo"
                        : selectedFund?.name ?? "Bolsillo"
                }
                accentColor={
                    depositTarget === "personal"
                        ? DEFAULT_PERSONAL_FUND_COLOR
                        : heroColor
                }
                initialValue={depositAmount || "0"}
                errorMessage={depositTarget ? depositError : undefined}
                onClose={closeDepositModal}
                onValueChange={(value) => setDepositAmount(value)}
                onConfirm={(value) => handleDepositConfirm(value)}
            />
            <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

            {/* Toast de notificación del sistema */}
            {systemNotification && (
                <div className="fixed top-6 left-1/2 z-200 -translate-x-1/2 animate-in slide-in-from-top-3 fade-in duration-300">
                    <div className="rounded-2xl bg-on-surface/95/95 px-5 py-3 text-sm font-medium text-white shadow-xl backdrop-blur-sm">
                        {systemNotification}
                    </div>
                </div>
            )}

            {/* Modal de confirmación de borrado */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-on-surface/95/60 backdrop-blur-sm"
                        onClick={closeDeleteModal}
                    />
                    <div className="relative w-full max-w-xs rounded-3xl bg-surface-lowest p-6 text-center shadow-2xl transition-all animate-in zoom-in-95 fade-in duration-200">
                        {/* Icóno */}
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50">
                            <Trash2 size={24} className="text-rose-500" />
                        </div>
                        <h3 className="mb-1 text-base font-bold text-on-surface">Eliminar Movimiento</h3>
                        <p className="mb-6 text-sm text-on-surface-variant">
                            ¿Estás seguro? Esta acción no se puede deshacer y ajustará los saldos.
                        </p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                disabled={isDeleting}
                                className="flex-1 rounded-xl bg-surface-low py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-50"
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
                        className={`absolute inset-0 bg-on-surface/95/60 backdrop-blur-sm transition-opacity duration-300 ${isFilterAnimated ? "opacity-100" : "opacity-0"
                            }`}
                        onClick={closeFilterModal}
                    />
                    <div
                        className={`relative flex max-h-[80vh] flex-col rounded-t-[2.5rem] bg-surface-lowest shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isFilterAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
                            }`}
                    >
                        <div className="flex justify-center pt-4 pb-2">
                            <div className="h-1.5 w-12 rounded-full bg-surface-container" />
                        </div>
                        <button
                            onClick={closeFilterModal}
                            className="absolute top-4 right-6 rounded-full bg-surface p-2 text-outline-variant transition-colors hover:text-on-surface-variant"
                        >
                            <X size={18} />
                        </button>
                        <div className="overflow-y-auto px-6 pb-8">
                            <h3 className="mb-5 text-lg font-bold text-on-surface">Filtrar Actividad</h3>
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
                                                ? "bg-primary/10 font-bold text-primary"
                                                : "bg-surface font-medium text-on-surface hover:bg-surface-low"
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
