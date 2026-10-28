"use client";

import { FormattedCurrency } from "@/components/FormattedCurrency";
import Link from "next/link";
import { useMemo, useRef, useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
    BarChart3,
    Check,
    ChevronDown,
    ChevronRight,
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
    ArrowLeftRight,
    Landmark,
    Send,
    Settings,
    SlidersHorizontal,
    Sparkles,
    Trash2,
    User,
    Wallet,
    X,
    type LucideIcon,
} from "lucide-react";
import { settleDebt } from "@/app/actions/debt";
import { createDeposit, createPersonalDeposit, deleteExpenseAction } from "@/app/actions/expenses";
import { getFamilyFundsMetaAction } from "@/app/actions/funds";
import { settleFundDebtAction } from "@/app/actions/settleFundDebt";
import { settleP2PAction } from "@/app/actions/settleP2P";
import { createClient } from "@/utils/supabase/client";
import { useExpenseModal } from "@/components/ExpenseModalProvider";
import {
    ExpenseDebtStatus,
    isFundSettlementConcept,
} from "@/components/ExpenseDebtStatus";
import FundEditorModal from "@/components/FundEditorModal";
import FundTransferSheet from "@/components/FundTransferSheet";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { Portal } from "@/components/ui/Portal";
import { useCurrency } from "@/hooks/useCurrency";
import { useFitItemCount } from "@/hooks/useFitItemCount";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useFundsStore } from "@/store/useFundsStore";
import type { DashboardMember } from "@/lib/dashboard";
import type { ExpenseSplitType } from "@/lib/expenses";
import { getCategoryDetails } from "@/lib/categoryMap";
import { isAccountOnlyMovement } from "@/lib/accounts";
import { resolveMovementIconColor } from "@/lib/movementIconColor";
import {
    calculateFundCashBalance,
    calculateFundOwesUser,
    calculatePersonalPocketBalance,
    DEFAULT_PERSONAL_FUND_COLOR,
    fundIconChipStyle,
    getDefaultSharedFund,
    getFavoriteSpendingFund,
    getPersonalFund,
    isFixedExpensesFund,
    isSharedLegacyResponsible,
    listActiveFunds,
    listDashboardSharedFunds,
    personalFundDisplayName,
    pickDashboardSelectedFundId,
    PERSONAL_FUND_COLOR_LIGHT,
    resolveFundColor,
    resolveFundUiColor,
    type FamilyFund,
} from "@/lib/funds";
import { tintedGlassGradient } from "@/lib/glass";
import ProductTour from "@/components/ProductTour";
import { useProductTour } from "@/hooks/useProductTour";
import type { ProductTourStep } from "@/components/ProductTour";
import { isTourDone, TOUR_DONE_EVENT, type TourId } from "@/lib/firstRun";
import { useIsDark } from "@/hooks/useIsDark";
import GuidanceWhyTrigger from "@/components/GuidanceWhyTrigger";
import HouseholdStatusBanner from "@/components/HouseholdStatusBanner";
import { buildDecisionContext } from "@/lib/decision/context";
import { selectPrimaryInsight } from "@/lib/decision/insights";
import { sumMonthSpend } from "@/lib/decision/spend";
import PremiumHeaderChip from "@/components/PremiumHeaderChip";
import type { HouseholdEntitlement } from "@/lib/premium";


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
    account_id?: string | null;
    paid_from_account?: boolean | null;
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
    initialFunds?: FamilyFund[];
    sharedDefaultFundId?: string | null;
    accountsVisibleLiquidity?: number;
    hasVisibleAccounts?: boolean;
    entitlement?: HouseholdEntitlement | null;
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

function pickInitialFunds(initialFunds?: FamilyFund[]) {
    if (initialFunds?.length) return initialFunds;
    return useFundsStore.getState().funds;
}

export default function DashboardCouple({
    familyId,
    currentUserId,
    familyName,
    currentUserName,
    partnerFirstName,
    members,
    expenses: ssrExpenses,
    mySpent: _mySpent,
    partnerSpent: _partnerSpent,
    fundBalance: ssrFundBalance,
    personalBalance: ssrPersonalBalance,
    financialModel = "joint_fund",
    initialFunds = [],
    sharedDefaultFundId = null,
    accountsVisibleLiquidity = 0,
    hasVisibleAccounts = false,
    entitlement = null,
}: DashboardCoupleProps) {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const { format: formatCurrency } = useCurrency();
    const isDark = useIsDark();
    const { setExpenseToEdit, setIsExpenseModalOpen, setPreferredFundId } = useExpenseModal();
    const isHydrated = useExpenseStore((s) => s.isHydrated);
    const storeExpenses = useExpenseStore((s) => s.expenses);
    const storePersonalBalance = useExpenseStore((s) => s.myAvailableFund);
    const storeFundLiquidity = useExpenseStore((s) => s.fundLiquidity);
    const isPremium = useExpenseStore((s) => s.isPremium);
    const storeFunds = useFundsStore((s) => s.funds);
    const storeAccounts = useAccountsStore((s) => s.accounts);
    const colorFunds = storeFunds.length > 0 ? storeFunds : initialFunds;

    const dashboardTourSteps = useMemo<ProductTourStep[]>(
        () => [
            {
                target: "dash-balance",
                title: "Saldo del bolsillo",
                body: "Es el dinero del bolsillo activo para gastar el mes — no el total del banco. En pareja pueden cambiar entre lo común y lo personal.",
            },
            {
                target: "dash-actions",
                title: "Acciones rápidas",
                body: "Registren un gasto, carguen el bolsillo o ajusten saldos sin perder el hilo.",
            },
            {
                target: "dash-modules",
                title: "Cuentas, ahorro y fijos",
                body: "La cuenta es el banco; el bolsillo organiza el gasto; el ahorro es lo que apartan. Atajos a cuentas, ahorro y gastos fijos para los dos.",
            },
            {
                target: "bottom-nav",
                title: "Menú inferior",
                body: "El botón central abre el menú para ir a historial, ahorro, gastos fijos o perfil.",
            },
        ],
        []
    );
    const dashTour = useProductTour(currentUserId, "dashboard", dashboardTourSteps, {
        hasFamily: true,
    });

    const coupleCollectTourSteps = useMemo<ProductTourStep[]>(
        () => [
            {
                target: "dash-collect",
                title: "Cobrar al bolsillo",
                body: "Aparece cuando tú pagaste algo que correspondía al bolsillo compartido (o a tu pareja). Cobrar marca esos gastos como recuperados: no es un cobro bancario, es saldar lo que el bolsillo (o la otra persona) te debe en la app.",
                placement: "bottom",
            },
        ],
        []
    );
    const coupleCollectTour = useProductTour(
        currentUserId,
        "coupleCollect",
        coupleCollectTourSteps,
        { hasFamily: true, autoStart: false }
    );

    // Prefer Zustand when it has data; if hydrated-but-empty while SSR has rows,
    // keep SSR so a failed client refetch cannot blank the dashboard.
    const preferStoreExpenses =
        isHydrated && (storeExpenses.length > 0 || ssrExpenses.length === 0);
    const expenses = useMemo<CoupleDashboardExpense[]>(() => {
        if (!preferStoreExpenses) return ssrExpenses;
        return storeExpenses.map((e) => ({
            id: e.id,
            concept: e.concept,
            amount: Number(e.amount),
            paid_by: e.paid_by,
            responsible_for: e.responsible_for,
            category: e.category,
            split_type: (e.split_type as ExpenseSplitType) || "full",
            expense_date: e.expense_date,
            created_at: e.created_at,
            is_settled: e.is_settled,
            family_id: e.family_id,
            fund_id: e.fund_id,
            paid_from_fund: e.paid_from_fund,
            account_id: e.account_id,
            paid_from_account: e.paid_from_account,
            transfer_group_id: e.transfer_group_id,
        }));
    }, [preferStoreExpenses, storeExpenses, ssrExpenses]);

    const preferStoreBalances =
        isHydrated && (storeExpenses.length > 0 || ssrExpenses.length === 0);
    const personalBalance = preferStoreBalances ? storePersonalBalance : ssrPersonalBalance;
    const fundBalance = preferStoreBalances ? storeFundLiquidity : ssrFundBalance;

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
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, startDeletingTransition] = useTransition();
    const [systemNotification, setSystemNotification] = useState<string | null>(null);
    const [sharedFunds, setSharedFunds] = useState<FamilyFund[]>(() =>
        listDashboardSharedFunds(pickInitialFunds(initialFunds)),
    );
    const [selectedFundId, setSelectedFundId] = useState<string | null>(() =>
        pickDashboardSelectedFundId(
            pickInitialFunds(initialFunds),
            currentUserId,
            sharedDefaultFundId
        ),
    );
    /** While true, keep the user's manual fund pick; on remount always reopen the favorite. */
    const userPickedFundRef = useRef(false);
    const [showFundsMenu, setShowFundsMenu] = useState(false);
    const [showFundTransfer, setShowFundTransfer] = useState(false);
    const [transferFromFundId, setTransferFromFundId] = useState<string | null>(null);
    const [showCreateFundModal, setShowCreateFundModal] = useState(false);
    const [editingFund, setEditingFund] = useState<FamilyFund | null>(null);
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
    const showToast = (message: string) => {
        setSystemNotification(message);
        window.setTimeout(() => setSystemNotification(null), 3000);
    };

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


    const sharedFundIds = useMemo(
        () => new Set(sharedFunds.map((fund) => fund.id)),
        [sharedFunds]
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
    // Prefer store pocket cash when hydrated (includes account_id filtering).
    // Before hydrate, derive from SSR rows (must carry account_id).
    const derivedPersonalPocket = useMemo(
        () => calculatePersonalPocketBalance(expenses, currentUserId, sharedFundIds),
        [expenses, currentUserId, sharedFundIds]
    );
    const myAvailableFund = preferStoreBalances ? storePersonalBalance : derivedPersonalPocket;
    const myBudget = Math.max(mySpent, 400);

    const fundIncome = useMemo(
        () =>
            expenses
                .filter((expense) => !isAccountOnlyMovement(expense))
                .filter(
                    (expense) => expense.category === "deposit" && expense.responsible_for === "joint_fund"
                )
                .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        [expenses]
    );
    const fundWithdrawals = useMemo(
        () =>
            expenses
                .filter((expense) => !isAccountOnlyMovement(expense))
                .filter(
                    (expense) => expense.category === "withdrawal" && expense.responsible_for === "joint_fund"
                )
                .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        [expenses]
    );
    const fundDirectExpenses = useMemo(
        () =>
            expenses
                .filter((expense) => !isAccountOnlyMovement(expense))
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
    // Product decision: couples only use shared/personal pockets (no P2P split models).
    const isJointModel = true;
    const hasP2PBalance = iOwePartner > 0 || partnerOwesMe > 0;

    const personalFund = useMemo(
        () =>
            getPersonalFund(
                storeFunds.length > 0 ? storeFunds : initialFunds,
                currentUserId
            ),
        [storeFunds, initialFunds, currentUserId]
    );

    const menuFunds = useMemo(() => {
        if (!personalFund) return sharedFunds;
        // Personal pocket at the end of the list.
        return [...sharedFunds.filter((f) => f.id !== personalFund.id), personalFund];
    }, [sharedFunds, personalFund]);

    const selectedFund =
        menuFunds.find((f) => f.id === selectedFundId) ??
        getFavoriteSpendingFund(
            storeFunds.length > 0 ? storeFunds : initialFunds,
            currentUserId
        ) ??
        getDefaultSharedFund(sharedFunds) ??
        sharedFunds[0] ??
        personalFund ??
        null;

    const selectedIsPersonal = selectedFund?.scope === "personal";

    const selectedFundBalance = useMemo(() => {
        // Avoid flashing the aggregate of all pockets before a fund is selected.
        if (!selectedFund) return 0;
        if (selectedFund.scope === "personal") {
            return myAvailableFund;
        }
        return calculateFundCashBalance(expenses, selectedFund.id, {
            treatLegacyJointAsFundId: getDefaultSharedFund(sharedFunds)?.id ?? null,
        });
    }, [expenses, selectedFund, sharedFunds, myAvailableFund]);

    const secondaryWidgetHint = isJointModel
        ? ""
        : hasP2PBalance
            ? personalBalance >= 0
                ? "A tu favor"
                : "Por pagar"
            : "Sin deuda";

    // Keep local shared list in sync with the zustand cache (SSR seed / soft nav).
    useEffect(() => {
        if (!storeFunds.length) return;
        const shared = listDashboardSharedFunds(storeFunds);
        setSharedFunds(shared);
        const personal = getPersonalFund(storeFunds, currentUserId);
        const favoriteId = pickDashboardSelectedFundId(
            storeFunds,
            currentUserId,
            sharedDefaultFundId
        );

        if (!userPickedFundRef.current) {
            if (favoriteId) setSelectedFundId(favoriteId);
            return;
        }

        setSelectedFundId((prev) => {
            if (prev && shared.some((f) => f.id === prev)) return prev;
            if (prev && personal?.id === prev) return prev;
            return favoriteId;
        });
    }, [storeFunds, sharedDefaultFundId, currentUserId]);

    useEffect(() => {
        if (initialFunds.length) {
            useFundsStore.getState().setFunds(initialFunds);
        }
        const preferred =
            selectedFundId &&
            sharedFunds.some((f) => f.id === selectedFundId && isFixedExpensesFund(f))
                ? sharedDefaultFundId
                : selectedFundId;
        setPreferredFundId(preferred);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from SSR
    }, []);

    useEffect(() => {
        // Refresh meta only if SSR/store had nothing (new family / migration).
        if (sharedFunds.length > 0) return;
        let cancelled = false;
        (async () => {
            try {
                const overview = await getFamilyFundsMetaAction();
                if (cancelled) return;
                useFundsStore.getState().setFunds(overview.funds);
                const shared = listDashboardSharedFunds(overview.funds);
                setSharedFunds(shared);

                const favoriteId = pickDashboardSelectedFundId(
                    overview.funds,
                    currentUserId,
                    overview.sharedDefaultFundId
                );
                let nextSelectedId: string | null = favoriteId;
                if (userPickedFundRef.current) {
                    setSelectedFundId((prev) => {
                        nextSelectedId =
                            prev &&
                            (shared.some((f) => f.id === prev) ||
                                overview.funds.some(
                                    (f) =>
                                        f.id === prev &&
                                        f.scope === "personal" &&
                                        f.owner_profile_id === currentUserId
                                ))
                                ? prev
                                : favoriteId;
                        return nextSelectedId;
                    });
                } else {
                    setSelectedFundId(favoriteId);
                }

                const preferredFundId =
                    nextSelectedId &&
                    shared.some((f) => f.id === nextSelectedId && isFixedExpensesFund(f))
                        ? overview.sharedDefaultFundId ?? null
                        : nextSelectedId;
                setPreferredFundId(preferredFundId);
            } catch {
                // Migration/table may be unavailable; keep legacy green card.
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [sharedFunds.length, setPreferredFundId]);

    const openEditFundModal = (fund: FamilyFund) => {
        setEditingFund(fund);
        setShowFundsMenu(false);
        setShowCreateFundModal(true);
    };

    const handleSelectFund = (fundId: string) => {
        userPickedFundRef.current = true;
        setSelectedFundId(fundId);
        const fund =
            sharedFunds.find((f) => f.id === fundId) ??
            (personalFund?.id === fundId ? personalFund : null);
        // Fixed-expenses / personal pockets are not the default for shared variable expenses.
        if (fund && fund.scope === "shared" && !isFixedExpensesFund(fund)) {
            setPreferredFundId(fundId);
        } else if (fund?.scope === "personal") {
            setPreferredFundId(fundId);
        }
        setShowFundsMenu(false);
    };

    const allTransferFunds = useMemo(() => {
        const fromStore = storeFunds.length > 0 ? storeFunds : initialFunds;
        return listActiveFunds(fromStore);
    }, [storeFunds, initialFunds]);

    const openFundTransfer = (fundId: string | null | undefined) => {
        const sourceId = fundId ?? selectedFundId;
        if (!sourceId) return;
        setTransferFromFundId(sourceId);
        setShowFundsMenu(false);
        setShowFundTransfer(true);
    };

    const handleFundTransferSuccess = async () => {
        const { syncFamilyExpenses } = await import("@/lib/realtimeFamily");
        await syncFamilyExpenses();
        try {
            const overview = await getFamilyFundsMetaAction();
            useFundsStore.getState().setFunds(overview.funds);
            setSharedFunds(listDashboardSharedFunds(overview.funds));
        } catch {
            // Keep current funds list; expense refresh still updates balances.
        }
        router.refresh();
        showToast("Transferencia entre bolsillos lista.");
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

    // Deudas por cada bolsillo compartido (excluye Gastos fijos)
    const fundDebts = useMemo(
        () =>
            sharedFunds
                .filter((fund) => !isFixedExpensesFund(fund))
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

    // Explain “Cobrar” the first time the button is visible — only after the
    // main dashboard tour is done (never stacked under that overlay).
    useEffect(() => {
        if (!currentUserId) return;

        const tryStartCollectTour = () => {
            const collectVisible =
                (isJointModel && fundOwesMe > 0) ||
                (!isJointModel && hasP2PBalance);
            if (!collectVisible) return;
            if (dashTour.open) return;
            if (!isTourDone(currentUserId, "dashboard")) return;
            coupleCollectTour.start(700);
        };

        tryStartCollectTour();

        function onTourDone(ev: Event) {
            const detail = (ev as CustomEvent<{ tourId?: TourId }>).detail;
            if (detail?.tourId !== "dashboard") return;
            // Dashboard overlay just closed — now safe to spotlight Cobrar.
            window.setTimeout(tryStartCollectTour, 400);
        }

        window.addEventListener(TOUR_DONE_EVENT, onTourDone);
        return () => window.removeEventListener(TOUR_DONE_EVENT, onTourDone);
    }, [
        currentUserId,
        fundOwesMe,
        hasP2PBalance,
        isJointModel,
        dashTour.open,
        coupleCollectTour.start,
    ]);

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
                    expense.category !== "fixed_expense" &&
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

    const recentListMeasureRef = useRef<HTMLDivElement>(null);
    const visibleRecentCount = useFitItemCount(recentListMeasureRef, {
        maxItems: 5,
        itemHeightPx: 64,
        minItems: 1,
    });
    const currentList = filteredExpenses.slice(0, visibleRecentCount);

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
            const { syncFamilyExpenses } = await import("@/lib/realtimeFamily");
            await syncFamilyExpenses();
            const { requestFirstMoveCelebrationCheck } = await import(
                "@/components/PartnerFirstMoveCelebration"
            );
            requestFirstMoveCelebrationCheck();
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
            const { syncFamilyExpenses } = await import("@/lib/realtimeFamily");
            await syncFamilyExpenses();
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
            const { syncFamilyExpenses } = await import("@/lib/realtimeFamily");
            await syncFamilyExpenses();
        });
    }

    useEffect(() => {
        if (typeof window === "undefined") return;

        const pending = window.sessionStorage.getItem("fsage:shared-welcome");
        const playing = window.sessionStorage.getItem("fsage:shared-welcome-playing");
        if (!pending && !playing) return;

        if (pending) {
            window.sessionStorage.removeItem("fsage:shared-welcome");
            window.sessionStorage.setItem("fsage:shared-welcome-playing", "1");
        }

        setShowSharedWelcome(true);
        setHighlightFundCard(true);
        setAnimateSharedEntrance(true);
    }, []);

    // Hide when the progress bar finishes — separate effect so remounts
    // (React Strict Mode) reschedule the dismiss timer.
    useEffect(() => {
        if (!showSharedWelcome) return;

        setWelcomeProgress(0);
        const raf = window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => setWelcomeProgress(100));
        });

        const hideId = window.setTimeout(() => {
            setShowSharedWelcome(false);
            setWelcomeProgress(0);
            setHighlightFundCard(false);
            try {
                window.sessionStorage.removeItem("fsage:shared-welcome-playing");
            } catch {
                // ignore
            }
        }, 2600);

        return () => {
            window.cancelAnimationFrame(raf);
            window.clearTimeout(hideId);
        };
    }, [showSharedWelcome]);

    // Expenses realtime lives in layout RealtimeSync → Zustand only.
    // Family settings still need a light RSC refresh when model/split changes.
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
        ? selectedIsPersonal
            ? "Mi bolsillo"
            : selectedFund?.name ?? "Bolsillo"
        : "Balance P2P";
    const heroColor = isJointModel
        ? resolveFundUiColor(selectedFund, isDark)
        : isDark
          ? DEFAULT_PERSONAL_FUND_COLOR
          : PERSONAL_FUND_COLOR_LIGHT;
    const currentMember =
        members.find((member) => member.id === currentUserId) ?? members[0] ?? null;

    const guidanceInsight = useMemo(() => {
        const fundsSource = storeFunds.length > 0 ? storeFunds : initialFunds;
        const fundsCount = fundsSource.length;
        const monthSpentFromLedger = sumMonthSpend(expenses);
        const monthSpentFallback =
            (typeof _mySpent === "number" ? _mySpent : 0) +
            (typeof _partnerSpent === "number" ? _partnerSpent : 0);
        const monthSpent =
            expenses.length > 0 ? monthSpentFromLedger : monthSpentFallback;
        // Same pockets the couple UI shows: shared spending + own personal.
        // Personal balance must match myAvailableFund (adelantos a compartidos),
        // not only caja tagged with personal fund_id.
        const sharedForMenu = listDashboardSharedFunds(fundsSource);
        const sharedIds = sharedForMenu.map((f) => f.id);
        const myPersonal = getPersonalFund(fundsSource, currentUserId);
        const legacySharedId = getDefaultSharedFund(fundsSource)?.id ?? null;
        const pockets = [
            ...sharedForMenu.map((fund) => ({
                name: fund.name,
                balance: calculateFundCashBalance(expenses, fund.id, {
                    treatLegacyJointAsFundId: legacySharedId,
                }),
            })),
            ...(myPersonal
                ? [
                      {
                          name: personalFundDisplayName(myPersonal),
                          balance: calculatePersonalPocketBalance(
                              expenses,
                              currentUserId,
                              sharedIds
                          ),
                      },
                  ]
                : []),
        ];
        return selectPrimaryInsight(
            buildDecisionContext({
                hasVisibleAccounts,
                accountsVisibleLiquidity,
                pocketOrHeroBalance: heroBalance,
                activePocketName: heroLabel,
                pockets,
                monthSpent,
                fundsCount,
                memberCount: entitlement?.memberCount ?? members.length,
                isCoupleUi: true,
            })
        );
    }, [
        hasVisibleAccounts,
        accountsVisibleLiquidity,
        heroBalance,
        heroLabel,
        expenses,
        _mySpent,
        _partnerSpent,
        storeFunds,
        initialFunds,
        entitlement?.memberCount,
        members.length,
    ]);


    return (
        <div className="relative flex h-dvh flex-col overflow-hidden bg-page-gradient">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-page-glow" />

            <header className="relative z-50 flex w-full shrink-0 items-center justify-between px-4 pb-1.5 pt-[max(0.75rem,var(--safe-top))]">
                <Link
                    href="/profile"
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
                </Link>
                <div className="flex items-center gap-1.5">
                    <PremiumHeaderChip
                        entitlement={entitlement}
                        isPremiumFallback={isPremium}
                    />
                </div>
            </header>

            <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 min-h-0 flex-col gap-[clamp(0.75rem,2.5dvh,1.25rem)] overflow-hidden px-4 pb-[var(--fab-clearance)] pt-1">
                <HouseholdStatusBanner entitlement={entitlement} />
                {showSharedWelcome && (
                    <div
                        key="shared-welcome"
                        className="pointer-events-none shrink-0 animate-in fade-in slide-in-from-top-4 duration-500"
                    >
                        <div className="overflow-hidden rounded-3xl border border-primary/25 bg-glass-strong p-3 shadow-[0_16px_40px_rgba(96,133,92,0.16)] backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary shadow-sm">
                                    <Sparkles size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-on-surface">Espacio compartido listo</p>
                                    <p className="text-xs text-on-surface-variant">Todo quedó sincronizado con {partnerDisplayName}.</p>
                                </div>
                            </div>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/15">
                                <div
                                    className="h-full rounded-full bg-linear-to-r from-primary to-primary-container transition-[width] ease-linear"
                                    style={{ width: `${welcomeProgress}%`, transitionDuration: "2400ms" }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <section
                    data-tour="dash-balance"
                    className={`relative shrink-0 ${animateSharedEntrance ? "animate-in slide-in-from-bottom-4 fade-in duration-700" : ""}`}
                    style={animateSharedEntrance ? { animationDelay: "80ms" } : undefined}
                >
                    <div
                        className="relative overflow-hidden rounded-[1.85rem] border-[0.5px] border-glass-border p-6 shadow-[var(--glass-shadow)] backdrop-blur-2xl transition-[background] duration-500"
                        style={{
                            backgroundImage: tintedGlassGradient(heroColor),
                        }}
                    >
                        <div className="relative z-10 flex min-w-0 items-center justify-between gap-3">
                            <GuidanceWhyTrigger insight={guidanceInsight} />
                            <div className="flex shrink-0 items-center gap-3">
                                <div className="min-w-0 text-right">
                                    <p className="text-[11px] font-light text-on-surface-variant">
                                        Saldo disponible
                                    </p>
                                    <p
                                        className={`truncate text-base font-medium ${
                                            isDark ? "text-on-surface" : ""
                                        }`}
                                        style={isDark ? undefined : { color: heroColor }}
                                    >
                                        {heroLabel}
                                    </p>
                                </div>
                                {isJointModel ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowFundsMenu((open) => !open)}
                                        className="icon-chip-fund icon-chip-coin relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl  transition-transform active:scale-95"
                                        style={fundIconChipStyle(heroColor)}
                                        aria-label="Seleccionar bolsillo"
                                        aria-expanded={showFundsMenu}
                                    >
                                        <Wallet size={20} strokeWidth={2.2} />
                                    </button>
                                ) : (
                                    <div
                                        className="icon-chip-fund icon-chip-coin flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                                        style={fundIconChipStyle(heroColor)}
                                    >
                                        <Wallet size={20} strokeWidth={2.2} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="relative z-10 mt-4 flex items-center gap-2.5">
                            <p
                                className={`text-[2.65rem] font-light leading-none tracking-tight ${
                                    Math.round((heroBalance || 0) * 100) / 100 < 0
                                        ? "text-[#8B5A2B]/90 dark:text-[#C4A574]/90"
                                        : "text-on-surface"
                                }`}
                            >
                                {balanceVisible ? <FormattedCurrency value={heroBalance} /> : "••••••"}
                            </p>
                            <button
                                type="button"
                                onClick={() => setBalanceVisible((v) => !v)}
                                className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-glass-soft"
                                aria-label={
                                    balanceVisible ? "Ocultar saldo" : "Mostrar saldo"
                                }
                            >
                                {balanceVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>
                    </div>

                    {isJointModel && showFundsMenu && (
                        <>
                            <button
                                type="button"
                                aria-label="Cerrar lista de bolsillos"
                                className="fixed inset-0 z-40 cursor-default"
                                onClick={() => setShowFundsMenu(false)}
                            />
                            <div
                                className="absolute right-4 top-[4.75rem] z-50 flex w-[17.5rem] max-h-[min(70dvh,calc(100dvh-4.75rem-var(--fab-clearance)-1rem))] flex-col overflow-hidden rounded-2xl border-[0.5px] border-outline-variant/25 bg-glass-soft shadow-[0_12px_28px_rgba(43,52,55,0.12)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200"
                            >
                                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-1 pt-2">
                                    {menuFunds.length === 0 ? (
                                        <p className="px-3 py-3 text-sm text-on-surface-variant">
                                            Aún no hay bolsillos.
                                        </p>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            {menuFunds.map((fund) => {
                                                const isPersonal = fund.scope === "personal";
                                                const balance = isPersonal
                                                    ? myAvailableFund
                                                    : calculateFundCashBalance(expenses, fund.id, {
                                                          treatLegacyJointAsFundId:
                                                              getDefaultSharedFund(sharedFunds)?.id ??
                                                              null,
                                                      });
                                                const isActive = selectedFund?.id === fund.id;
                                                const fundColor = resolveFundUiColor(fund, isDark);
                                                const displayName = isPersonal
                                                    ? personalFundDisplayName(fund)
                                                    : fund.name;
                                                return (
                                                    <div
                                                        key={fund.id}
                                                        className={`flex w-full items-center overflow-hidden rounded-xl transition-[box-shadow,transform,border-color] ${
                                                            isActive
                                                                ? "border border-transparent shadow-[0_6px_16px_rgba(43,52,55,0.14)]"
                                                                : "border border-transparent hover:brightness-[1.02]"
                                                        }`}
                                                        style={
                                                            isActive
                                                                ? {
                                                                      backgroundImage: `linear-gradient(to left, ${fundColor}88 0%, ${fundColor}28 42%, transparent 88%)`,
                                                                      borderColor: `${fundColor}99`,
                                                                      boxShadow: `0 6px 16px ${fundColor}33, 0 2px 6px rgba(43,52,55,0.08)`,
                                                                  }
                                                                : {
                                                                      backgroundColor: `${fundColor}12`,
                                                                  }
                                                        }
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSelectFund(fund.id)}
                                                            className="flex min-w-0 flex-1 items-center justify-between gap-2 px-2.5 py-2 text-left"
                                                        >
                                                            <span
                                                                className={`min-w-0 truncate text-[13px] ${
                                                                    isActive
                                                                        ? "font-semibold text-on-surface"
                                                                        : "font-medium text-on-surface"
                                                                }`}
                                                            >
                                                                {displayName}
                                                            </span>
                                                            <span
                                                                className={`shrink-0 text-[11px] font-medium tabular-nums ${
                                                                    isActive
                                                                        ? "text-on-surface"
                                                                        : "text-on-surface-variant"
                                                                }`}
                                                            >
                                                                <FormattedCurrency value={balance} />
                                                            </span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openEditFundModal(fund);
                                                            }}
                                                            className="mr-1 shrink-0 rounded-lg p-1.5 text-outline-variant transition-colors hover:bg-glass-strong hover:text-on-surface"
                                                            aria-label={`Editar ${displayName}`}
                                                            title="Editar"
                                                        >
                                                            <Edit size={13} strokeWidth={2.1} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="flex shrink-0 justify-center px-2 pb-2.5 pt-1.5">
                                    <Link
                                        href="/bolsillos"
                                        onClick={() => setShowFundsMenu(false)}
                                        className="rounded-full border border-glass-border bg-glass-soft px-3 py-1.5 text-[11px] font-medium text-on-surface transition-colors hover:bg-glass"
                                    >
                                        Administrar bolsillos
                                    </Link>
                                </div>
                            </div>
                        </>
                    )}
                </section>

                {(() => {
                    const showCollect =
                        (isJointModel && fundOwesMe > 0) ||
                        (!isJointModel && hasP2PBalance);
                    const tileClass =
                        "flex min-w-0 items-center gap-1 rounded-xl bg-surface-low px-2.5 py-2 text-left transition-colors hover:bg-surface-container";

                    return (
                        <section
                            data-tour="dash-modules"
                            className={`relative shrink-0 ${
                                animateSharedEntrance
                                    ? "animate-in fade-in slide-in-from-bottom-3 duration-700"
                                    : ""
                            }`}
                            style={
                                animateSharedEntrance
                                    ? { animationDelay: "120ms" }
                                    : undefined
                            }
                        >
                            <div
                                className={`grid gap-1.5 ${
                                    showCollect ? "grid-cols-3" : "grid-cols-2"
                                }`}
                            >
                                <Link href="/accounts" className={tileClass}>
                                    <Landmark
                                        size={11}
                                        className="shrink-0 text-on-surface-variant"
                                    />
                                    <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-on-surface-variant">
                                        Cuentas
                                    </span>
                                    <span className="shrink-0 text-[10px] font-medium tabular-nums text-on-surface">
                                        {hasVisibleAccounts
                                            ? balanceVisible
                                                ? <FormattedCurrency value={accountsVisibleLiquidity} />
                                                : "••••"
                                            : "Abrir"}
                                    </span>
                                </Link>

                                <button
                                    type="button"
                                    onClick={openPersonalDepositModal}
                                    className={tileClass}
                                >
                                    <span
                                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                                        style={{
                                            backgroundColor: isDark
                                                ? DEFAULT_PERSONAL_FUND_COLOR
                                                : PERSONAL_FUND_COLOR_LIGHT,
                                        }}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-on-surface-variant">
                                        Mi bolsillo
                                    </span>
                                    <span className="shrink-0 text-[10px] font-medium tabular-nums text-on-surface">
                                        {balanceVisible
                                            ? <FormattedCurrency value={myAvailableFund} />
                                            : "••••"}
                                    </span>
                                </button>

                                {isJointModel && fundOwesMe > 0 && (
                                    <button
                                        type="button"
                                        data-tour="dash-collect"
                                        onClick={openBalancesModal}
                                        className="flex min-w-0 items-center gap-1 rounded-xl bg-orange-500/15 px-2.5 py-2 text-left transition-colors hover:bg-orange-500/20"
                                    >
                                        <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-orange-600">
                                            Cobrar
                                        </span>
                                        <span className="shrink-0 text-[10px] font-medium tabular-nums text-orange-600">
                                            <FormattedCurrency value={fundOwesMe} />
                                        </span>
                                        <ChevronRight
                                            size={10}
                                            className="shrink-0 text-orange-600"
                                        />
                                    </button>
                                )}

                                {!isJointModel && hasP2PBalance && (
                                    <button
                                        type="button"
                                        data-tour="dash-collect"
                                        onClick={openBalancesModal}
                                        className={tileClass}
                                    >
                                        <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-on-surface-variant">
                                            {secondaryWidgetHint || "Saldos"}
                                        </span>
                                        <span className="shrink-0 text-[10px] font-medium tabular-nums text-on-surface">
                                            Ver
                                        </span>
                                        <ChevronRight
                                            size={10}
                                            className="shrink-0 text-on-surface-variant"
                                        />
                                    </button>
                                )}
                            </div>
                        </section>
                    );
                })()}

                <section
                    data-tour="dash-actions"
                    className={`relative shrink-0 ${animateSharedEntrance ? "animate-in fade-in slide-in-from-bottom-3 duration-700" : ""}`}
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
                                    setPreferredFundId(selectedFundId);
                                    setIsExpenseModalOpen(true);
                                },
                                darkFab: true,
                            },
                            {
                                key: "shared",
                                label: isJointModel ? "Cargar bolsillo" : "Liquidar",
                                icon: isJointModel ? Send : Scale,
                                onClick: isJointModel
                                    ? selectedIsPersonal
                                        ? openPersonalDepositModal
                                        : openDepositModal
                                    : openBalancesModal,
                            },
                            isJointModel
                                ? {
                                      key: "transfer",
                                      label: "Transferir",
                                      icon: ArrowLeftRight,
                                      onClick: () => openFundTransfer(selectedFundId),
                                  }
                                : {
                                      key: "collect",
                                      label: fundOwesMe > 0 || hasP2PBalance ? "Cobrar" : "Saldos",
                                      icon: HandCoins,
                                      onClick: openBalancesModal,
                                  },
                            {
                                key: "funds",
                                label: isJointModel ? "Cuentas" : "Filtros",
                                icon: isJointModel ? Landmark : SlidersHorizontal,
                                onClick: isJointModel
                                    ? () => router.push("/accounts")
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
                                        className={`flex h-11 w-11 items-center justify-center rounded-full transition-[background] duration-500 ${
                                            darkFab
                                                ? "fab-accent"
                                                : isAportar
                                                  ? "border shadow-[0_6px_14px_rgba(43,52,55,0.06)] backdrop-blur-md"
                                                  : "border border-outline-variant/25 bg-surface-lowest/80 text-on-surface shadow-[0_6px_14px_rgba(43,52,55,0.06)] backdrop-blur-md"
                                        }`}
                                        style={
                                            isAportar && !darkFab
                                                ? {
                                                      backgroundImage: tintedGlassGradient(heroColor),
                                                      color: heroColor,
                                                      borderColor: `${heroColor}55`,
                                                  }
                                                : undefined
                                        }
                                    >
                                        <Icon size={17} strokeWidth={darkFab ? 2.2 : 1.7} />
                                    </span>
                                    <span className="max-w-[4.75rem] text-center text-[10px] font-medium leading-tight text-on-surface">
                                        {label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </section>

                    {/* Modal de Liquidación: portaled above BottomNav stacking context */}
                    {showSettleModal && (
                        <Portal>
                        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                            <div className={`absolute inset-0 bg-on-surface/95/60 backdrop-blur-sm transition-opacity duration-300 ${isSettleAnimated ? "opacity-100" : "opacity-0"}`} onClick={closeSettleModal} />
                            <div className={`relative flex max-h-[90vh] flex-col rounded-t-[2rem] border border-glass-border glass-sheet transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSettleAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
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
                                            : `Cobrar a ${settleScopeFund?.name ?? "bolsillo"}`}
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
                                                            : "border-outline-variant/20 bg-glass"
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
                                                        <FormattedCurrency value={Number(expense.amount)} />
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
                                                    : 'bg-primary text-on-primary'
                                                    }`}
                                            >
                                                Recuperar {selectedTotal > 0 ? <FormattedCurrency value={selectedTotal} /> : ''}
                                            </button>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                        </Portal>
                    )}
                    {/* Modal P2P: PAGAR */}
                    {showPayModal && (
                        <Portal>
                        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                            <div className={`absolute inset-0 bg-on-surface/95/60 backdrop-blur-sm transition-opacity duration-300 ${isPayAnimated ? "opacity-100" : "opacity-0"}`} onClick={closePayModal} />
                            <div className={`relative flex max-h-[90vh] flex-col rounded-t-[2rem] border border-glass-border glass-sheet transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isPayAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
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
                                                    className={`w-full flex justify-between items-center p-4 border rounded-2xl transition-all duration-500 ${isSelected ? 'border-[#bb1b1b] bg-[#bb1b1b]/5' : 'border-outline-variant/20 bg-glass'
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
                                                        <FormattedCurrency value={Number(expense.amount)} />
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
                                                Pagar {selectedTotal > 0 ? <FormattedCurrency value={selectedTotal} /> : ''}
                                            </button>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                        </Portal>
                    )}
                    {/* Modal P2P: COBRAR */}
                    {showChargeModal && (
                        <Portal>
                        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                            <div className={`absolute inset-0 bg-on-surface/95/60 backdrop-blur-sm transition-opacity duration-300 ${isChargeAnimated ? "opacity-100" : "opacity-0"}`} onClick={closeChargeModal} />
                            <div className={`relative flex max-h-[90vh] flex-col rounded-t-[2rem] border border-glass-border glass-sheet transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isChargeAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
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
                                                    className={`w-full flex justify-between items-center p-4 border rounded-2xl transition-all duration-500 ${isSelected ? 'border-[#0f2d91] bg-[#0f2d91]/5' : 'border-outline-variant/20 bg-glass'
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
                                                        <FormattedCurrency value={Number(expense.amount)} />
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
                                                Cobrar {selectedTotal > 0 ? <FormattedCurrency value={selectedTotal} /> : ''}
                                            </button>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                        </Portal>
                    )}

                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="mb-2 flex shrink-0 items-center justify-between px-1">
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
                        ref={recentListMeasureRef}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                    <div
                        className={`flex max-h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-glass-border bg-glass shadow-[var(--glass-shadow)] backdrop-blur-md ${
                            filteredExpenses.length === 0 ? "flex-1" : "shrink-0"
                        } ${animateSharedEntrance ? "animate-in slide-in-from-bottom-5 fade-in duration-700" : ""}`}
                        style={animateSharedEntrance ? { animationDelay: "240ms" } : undefined}
                    >
                        {filteredExpenses.length === 0 ? (
                            <div className="flex h-full flex-1 flex-col items-center justify-center p-6 text-center animate-in fade-in duration-1000">
                                <div className="relative mb-4 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full bg-primary opacity-10 animate-ping duration-1000" />
                                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-emerald-100/50 bg-glass text-primary shadow-sm backdrop-blur-md">
                                        <Receipt size={28} strokeWidth={1.5} />
                                    </div>
                                </div>

                                <h4 className="mb-1 text-base font-medium text-on-surface">Todo está tranquilo</h4>
                                <p className="max-w-55 text-xs leading-relaxed text-outline-variant">
                                    Aún no hay movimientos aquí. Usa el botón + para registrar tu primer gasto.
                                </p>
                            </div>
                        ) : (
                            <div className="min-h-0 overflow-hidden">
                                {currentList.map((expense, index) => {
                                    const categoryPresentation = getExpenseCategoryPresentation(expense.category);
                                    const Icon = categoryPresentation.icon;
                                    const isDeposit = expense.category === "deposit";
                                    const isWithdrawal = expense.category === "withdrawal";
                                    const isDebt = expense.paid_by !== expense.responsible_for && expense.category !== "deposit";
                                    const isModifiable =
                                        (isDeposit || isWithdrawal || !expense.is_settled) &&
                                        expense.concept !== "Reembolso del fondo" &&
                                        !isFundSettlementConcept(expense.concept);
                                    const iconColor = resolveMovementIconColor(
                                        expense,
                                        colorFunds,
                                        storeAccounts,
                                        currentUserId
                                    );

                                    return (
                                        <div
                                            key={expense.id}
                                            className="group relative flex shrink-0 items-stretch overflow-hidden border-b border-glass-border last:border-0 animate-in slide-in-from-left-8 fade-in duration-500 fill-mode-both"
                                            style={{ animationDelay: `${index * 60}ms` }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => toggleActions(expense.id)}
                                                className={`flex w-full items-center justify-between gap-2.5 px-3.5 py-3.5 text-left transition-colors duration-200 ${
                                                    activeActionId === expense.id ? "bg-glass-soft pr-2" : "bg-transparent"
                                                }`}
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div
                                                        className="icon-chip-fund flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
                                                        style={fundIconChipStyle(iconColor)}
                                                    >
                                                        <Icon size={15} strokeWidth={2} />
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
                                                    {isDeposit ? "+" : "-"}
                                                    <FormattedCurrency value={Number(expense.amount)} />
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
                </div>
            </main>

            {showBudget && (
                <Portal>
                <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                    <div className={`absolute inset-0 bg-on-surface/95/60 backdrop-blur-sm transition-opacity duration-300 ${isBudgetAnimated ? "opacity-100" : "opacity-0"}`} onClick={closeBudgetModal} />
                    <div className={`relative flex max-h-[90vh] flex-col rounded-t-[2rem] border border-glass-border glass-sheet transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isBudgetAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
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
                                    <p className="text-xs text-on-surface-variant">Estado actual de tus bolsillos compartidos y personales.</p>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-glass-border bg-glass divide-y divide-outline-variant/20">
                                <div className="p-4">
                                    <div className="mb-2 flex items-end justify-between">
                                        <div>
                                            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-on-surface-variant">Mi Bolsillo</span>
                                            <span className="text-base font-bold text-on-surface"><FormattedCurrency value={mySpent} /></span>
                                        </div>
                                        <span className="text-[11px] font-medium text-outline-variant">de <FormattedCurrency value={myBudget} /></span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-surface-low">
                                        <div className="h-1.5 rounded-full bg-on-surface/95" style={{ width: `${Math.min((mySpent / myBudget) * 100, 100)}%` }} />
                                    </div>
                                </div>

                                <div className="p-4">
                                    <div className="mb-2 flex items-end justify-between">
                                        <div>
                                            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-primary">
                                                {getDefaultSharedFund(sharedFunds)?.name ?? "Bolsillos"}
                                            </span>
                                            <span className="text-base font-bold text-on-surface"><FormattedCurrency value={fundSpent} /></span>
                                        </div>
                                        <span className="text-[11px] font-medium text-outline-variant">de <FormattedCurrency value={fundBudget} /></span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-surface-low">
                                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min((fundSpent / fundBudget) * 100, 100)}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </Portal>
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
                            className={`relative flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[2rem] border border-glass-border glass-sheet transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
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
                                    className="absolute right-4 top-2 flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/25 bg-glass-strong text-on-surface-variant shadow-sm backdrop-blur-sm transition-colors hover:bg-glass-strong"
                                    aria-label="Cerrar"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8">
                                <div className="overflow-hidden rounded-2xl border border-glass-border bg-glass shadow-[0_8px_20px_rgba(43,52,55,0.06)] backdrop-blur-md divide-y divide-outline-variant/15">
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
                                                        <FormattedCurrency value={amount} />
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
                                                    <FormattedCurrency value={fundOwesMe} />
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
                                                    <FormattedCurrency value={iOwePartner} />
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
                                                    <FormattedCurrency value={partnerOwesMe} />
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


            <FundEditorModal
                open={showCreateFundModal}
                onClose={() => {
                    setShowCreateFundModal(false);
                    setEditingFund(null);
                }}
                editingFund={editingFund}
                createScope="shared"
                defaultLabel="default"
                onSaved={({ fund, funds, mode }) => {
                    useFundsStore.getState().setFunds(funds);
                    setSharedFunds(listDashboardSharedFunds(funds));
                    if (mode === "create" || fund.is_default) {
                        userPickedFundRef.current = true;
                        setSelectedFundId(fund.id);
                        if (fund.scope === "shared" && !isFixedExpensesFund(fund)) {
                            setPreferredFundId(fund.id);
                        } else if (fund.scope === "personal") {
                            setPreferredFundId(fund.id);
                        }
                    } else if (selectedFundId === fund.id) {
                        setSelectedFundId(fund.id);
                    }
                }}
            />

            <NumericKeypadSheet
                isOpen={Boolean(depositTarget)}
                title={
                    depositTarget === "personal"
                        ? "Cargar mi bolsillo"
                        : "Cargar el bolsillo"
                }
                subtitle={
                    depositTarget === "personal"
                        ? "Mi bolsillo"
                        : selectedIsPersonal
                          ? "Mi bolsillo"
                          : selectedFund?.name ?? "Bolsillo"
                }
                hint="También pueden hacerlo desde Cuentas → Transferir (banco → bolsillo)."
                accentColor={
                    depositTarget === "personal" || selectedIsPersonal
                        ? isDark
                            ? DEFAULT_PERSONAL_FUND_COLOR
                            : PERSONAL_FUND_COLOR_LIGHT
                        : heroColor
                }
                initialValue={depositAmount || "0"}
                errorMessage={depositTarget ? depositError : undefined}
                onClose={closeDepositModal}
                onValueChange={(value) => setDepositAmount(value)}
                onConfirm={(value) => handleDepositConfirm(value)}
            />

            <FundTransferSheet
                open={showFundTransfer}
                onClose={() => {
                    setShowFundTransfer(false);
                    setTransferFromFundId(null);
                }}
                currentUserId={currentUserId}
                fromFundId={transferFromFundId}
                funds={allTransferFunds}
                onSuccess={handleFundTransferSuccess}
            />
            {/* Toast de notificación del sistema */}
            {systemNotification && (
                <Portal>
                <div className="fixed top-6 left-1/2 z-[200] -translate-x-1/2 animate-in slide-in-from-top-3 fade-in duration-300">
                    <div className="rounded-2xl bg-on-surface/95/95 px-5 py-3 text-sm font-medium text-white shadow-xl backdrop-blur-sm">
                        {systemNotification}
                    </div>
                </div>
                </Portal>
            )}

            {/* Modal de confirmación de borrado */}
            {isDeleteModalOpen && (
                <Portal>
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-on-surface/95/60 backdrop-blur-sm"
                        onClick={closeDeleteModal}
                    />
                    <div className="glass-modal relative w-full max-w-xs rounded-3xl p-6 text-center transition-all animate-in zoom-in-95 fade-in duration-200">
                        <div className="modal-danger-icon mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                            <Trash2 size={24} />
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
                                className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-70"
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
                </Portal>
            )}

            {/* Modal de Filtros */}
            {showFilterModal && (
                <Portal>
                <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                    <div
                        className={`absolute inset-0 bg-on-surface/95/60 backdrop-blur-sm transition-opacity duration-300 ${isFilterAnimated ? "opacity-100" : "opacity-0"
                            }`}
                        onClick={closeFilterModal}
                    />
                    <div
                        className={`relative flex max-h-[80vh] flex-col rounded-t-[2rem] border border-glass-border glass-sheet transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isFilterAnimated ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
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
                                    { value: "shared_all", label: "Bolsillos (todos)" },
                                    { value: "shared_me", label: "Bolsillos (pagados por mí)" },
                                    { value: "shared_partner", label: `Bolsillos (pagados por ${partnerDisplayName})` },
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
                </Portal>
            )}

            <ProductTour open={dashTour.open} steps={dashTour.steps} onClose={dashTour.close} />
            <ProductTour
                open={coupleCollectTour.open}
                steps={coupleCollectTour.steps}
                onClose={coupleCollectTour.close}
            />
        </div>
    );
}

const filterLabels: Record<Exclude<ActivityFilter, "all">, string> = {
    personal: "Personal",
    shared_all: "Bolsillos",
    shared_me: "Bolsillos (mí)",
    shared_partner: "Bolsillos (pareja)",
};
