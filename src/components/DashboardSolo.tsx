"use client";

import { FormattedCurrency } from "@/components/FormattedCurrency";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
    ArrowLeftRight,
    BarChart3,
    CalendarClock,
    CheckCircle2,
    Edit,
    Eye,
    EyeOff,
    Landmark,
    LoaderCircle,
    PiggyBank,
    Plus,
    Receipt,
    Sparkles,
    Trash2,
    Wallet,
    X,
} from "lucide-react";
import {
    depositToFundAction,
    getFamilyFundsMetaAction,
} from "@/app/actions/funds";
import { useExpenseModal } from "@/components/ExpenseModalProvider";
import FundEditorModal from "@/components/FundEditorModal";
import FundTransferSheet from "@/components/FundTransferSheet";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { Portal } from "@/components/ui/Portal";
import { useCurrency } from "@/hooks/useCurrency";
import { useFitItemCount } from "@/hooks/useFitItemCount";
import type { DashboardBudget, DashboardTransaction } from "@/lib/dashboard";
import { createClient } from "@/utils/supabase/client";
import { tintedGlassGradient } from "@/lib/glass";
import {
    calculateSoloPersonalFundBalance,
    DEFAULT_PERSONAL_FUND_COLOR,
    fundIconChipStyle,
    getPersonalFund,
    listSoloDashboardFunds,
    personalFundDisplayName,
    resolveFundUiColor,
    type FamilyFund,
} from "@/lib/funds";
import { resolveExpenseCategoryIcon } from "@/lib/familyCategories";
import { resolveMovementIconColor } from "@/lib/movementIconColor";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useCategoriesStore } from "@/store/useCategoriesStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useFundsStore } from "@/store/useFundsStore";
import ProductTour from "@/components/ProductTour";
import { useProductTour } from "@/hooks/useProductTour";
import type { ProductTourStep } from "@/components/ProductTour";
import { useIsDark } from "@/hooks/useIsDark";
import GuidanceWhyTrigger from "@/components/GuidanceWhyTrigger";
import HouseholdStatusBanner from "@/components/HouseholdStatusBanner";
import PremiumHeaderChip from "@/components/PremiumHeaderChip";
import { buildDecisionContext } from "@/lib/decision/context";
import { selectPrimaryInsight } from "@/lib/decision/insights";
import { sumMonthSpend } from "@/lib/decision/spend";
import type { HouseholdEntitlement } from "@/lib/premium";

interface DashboardSoloProps {
    currentUserId: string;
    familyId: string;
    userName: string;
    avatarUrl?: string | null;
    budget: DashboardBudget;
    transactions: DashboardTransaction[];
    pocketBalance: number;
    accountsVisibleLiquidity?: number;
    hasVisibleAccounts?: boolean;
    initialFunds?: FamilyFund[];
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

function getFirstName(value?: string | null, fallback = "Tú") {
    const firstName = value?.trim().split(/\s+/)[0];
    return firstName || fallback;
}

export default function DashboardSolo({
    currentUserId,
    familyId,
    userName,
    avatarUrl,
    budget: _budget,
    transactions,
    pocketBalance,
    accountsVisibleLiquidity = 0,
    hasVisibleAccounts = false,
    initialFunds = [],
    entitlement = null,
}: DashboardSoloProps) {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const { format: formatCurrency } = useCurrency();
    const isDark = useIsDark();
    const { setExpenseToEdit, setIsExpenseModalOpen, setPreferredFundId } = useExpenseModal();
    const isHydrated = useExpenseStore((s) => s.isHydrated);
    const storePremium = useExpenseStore((s) => s.isPremium);
    const storeExpenses = useExpenseStore((s) => s.expenses);
    const storeFunds = useFundsStore((s) => s.funds);
    const storeAccounts = useAccountsStore((s) => s.accounts);
    const familyCategories = useCategoriesStore((s) => s.categories);
    const loadCategories = useCategoriesStore((s) => s.load);
    const colorFunds = storeFunds.length > 0 ? storeFunds : initialFunds;
    const displayName = userName?.trim() || "Usuario";

    useEffect(() => {
        void loadCategories();
    }, [loadCategories]);

    const dashboardTourSteps = useMemo<ProductTourStep[]>(
        () => [
            {
                target: "dash-balance",
                title: "Tu saldo del bolsillo",
                body: "Es el dinero del bolsillo activo para gastar el mes — no el total del banco. Toca el icono para cambiar o crear bolsillos.",
            },
            {
                target: "dash-actions",
                title: "Acciones del día a día",
                body: "Registra un gasto, carga el bolsillo o transfiere entre bolsillos en un momento.",
            },
            {
                target: "dash-modules",
                title: "Cuentas, ahorro y fijos",
                body: "La cuenta es el banco; el bolsillo organiza el gasto; el ahorro es lo que apartas. Desde aquí entras a cuentas, ahorro y pagos fijos.",
            },
            {
                target: "bottom-nav",
                title: "Menú inferior",
                body: "Toca el botón central para abrir el menú y moverte entre inicio, historial y perfil.",
            },
        ],
        []
    );
    const dashTour = useProductTour(currentUserId, "dashboard", dashboardTourSteps, {
        hasFamily: true,
    });

    const personalFunds = useMemo(() => {
        const source = storeFunds.length > 0 ? storeFunds : initialFunds;
        return listSoloDashboardFunds(source, currentUserId);
    }, [storeFunds, initialFunds, currentUserId]);

    const defaultPersonal = useMemo(
        () => getPersonalFund(personalFunds, currentUserId),
        [personalFunds, currentUserId]
    );

    const [selectedFundId, setSelectedFundId] = useState<string | null>(
        () => defaultPersonal?.id ?? initialFunds.find((f) => f.scope === "personal")?.id ?? null
    );
    const userPickedFundRef = useRef(false);
    const [showFundsMenu, setShowFundsMenu] = useState(false);
    const [showCreateFundModal, setShowCreateFundModal] = useState(false);
    const [editingFund, setEditingFund] = useState<FamilyFund | null>(null);
    const [showFundTransfer, setShowFundTransfer] = useState(false);
    const [transferFromFundId, setTransferFromFundId] = useState<string | null>(null);

    const selectedFund =
        personalFunds.find((f) => f.id === selectedFundId) ?? defaultPersonal ?? personalFunds[0] ?? null;

    const displayBalance = useMemo(() => {
        const preferStore = isHydrated && storeExpenses.length > 0;
        if (!selectedFund) {
            return preferStore
                ? useExpenseStore.getState().myAvailableFund
                : pocketBalance;
        }
        if (!preferStore && selectedFund.id === defaultPersonal?.id) {
            return pocketBalance;
        }
        const rows = preferStore ? storeExpenses : [];
        return calculateSoloPersonalFundBalance(
            rows,
            selectedFund,
            currentUserId,
            defaultPersonal?.id ?? null
        );
    }, [
        selectedFund,
        isHydrated,
        storeExpenses,
        pocketBalance,
        currentUserId,
        defaultPersonal?.id,
    ]);

    const heroColor = resolveFundUiColor(selectedFund, isDark);
    const heroTitle =
        personalFundDisplayName(selectedFund, {
            primaryId: defaultPersonal?.id ?? null,
        });

    const guidanceInsight = useMemo(() => {
        const fundsCount = (storeFunds.length > 0 ? storeFunds : initialFunds).length;
        const preferStore = isHydrated && storeExpenses.length > 0;
        const rows = preferStore ? storeExpenses : [];
        const pockets = personalFunds.map((fund) => ({
            name: personalFundDisplayName(fund, {
                primaryId: defaultPersonal?.id ?? null,
            }),
            balance: calculateSoloPersonalFundBalance(
                rows,
                fund,
                currentUserId,
                defaultPersonal?.id ?? null
            ),
        }));
        const monthSpent =
            rows.length > 0 ? sumMonthSpend(rows) : Number(_budget?.spent) || 0;
        return selectPrimaryInsight(
            buildDecisionContext({
                hasVisibleAccounts,
                accountsVisibleLiquidity,
                pocketOrHeroBalance: displayBalance,
                activePocketName: heroTitle,
                pockets,
                monthSpent,
                fundsCount,
                memberCount: entitlement?.memberCount ?? 1,
                isCoupleUi: false,
            })
        );
    }, [
        hasVisibleAccounts,
        accountsVisibleLiquidity,
        displayBalance,
        heroTitle,
        personalFunds,
        isHydrated,
        storeExpenses,
        currentUserId,
        defaultPersonal?.id,
        _budget?.spent,
        storeFunds,
        initialFunds,
        entitlement?.memberCount,
    ]);

    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const [balanceVisible, setBalanceVisible] = useState(true);
    const [showDeposit, setShowDeposit] = useState(false);
    const [depositAmount, setDepositAmount] = useState("");
    const [depositError, setDepositError] = useState("");
    const [, startDepositTransition] = useTransition();
    const [isPartnerJoining, setIsPartnerJoining] = useState(false);
    const [transitionStep, setTransitionStep] = useState(0);
    const hasCelebratedRef = useRef(false);
    const refreshTimeoutRef = useRef<number | null>(null);
    const stageTimeoutsRef = useRef<number[]>([]);
    const recentListMeasureRef = useRef<HTMLDivElement>(null);
    const visibleRecentCount = useFitItemCount(recentListMeasureRef, {
        maxItems: 5,
        itemHeightPx: 64,
        minItems: 1,
    });
    const currentList = transactions.slice(0, visibleRecentCount);
    const transitionStages = [
        "Tu pareja se ha unido",
        "Sincronizando movimientos",
        "Preparando tablero compartido",
    ] as const;
    const progressValue = [28, 68, 100][transitionStep] ?? 28;

    useEffect(() => {
        async function triggerCelebration() {
            if (hasCelebratedRef.current) {
                return;
            }

            hasCelebratedRef.current = true;
            setIsPartnerJoining(true);
            setTransitionStep(0);

            stageTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
            stageTimeoutsRef.current = [
                window.setTimeout(() => setTransitionStep(1), 850),
                window.setTimeout(() => setTransitionStep(2), 1850),
            ];

            try {
                const confettiModule = await import("canvas-confetti");
                const confetti = confettiModule.default;
                const sharedConfig = {
                    spread: 72,
                    startVelocity: 28,
                    ticks: 220,
                    gravity: 0.9,
                    scalar: 0.9,
                    zIndex: 9999,
                    // Brand navy + muted gold (SinDescuadre)
                    colors: ["#1c2740", "#1e3a8a", "#c4a574", "#e8e2d6"],
                };

                confetti({ ...sharedConfig, particleCount: 90, origin: { x: 0.18, y: 0.78 } });
                confetti({ ...sharedConfig, particleCount: 90, origin: { x: 0.82, y: 0.78 } });
                window.setTimeout(() => {
                    confetti({ ...sharedConfig, particleCount: 50, spread: 90, origin: { x: 0.5, y: 0.65 } });
                }, 180);
            } catch {
                // no-op: transition should continue even if confetti is unavailable
            }

            refreshTimeoutRef.current = window.setTimeout(() => {
                try {
                    window.sessionStorage.setItem("fsage:shared-welcome", JSON.stringify({ at: Date.now() }));
                } catch {
                    // ignore storage issues and continue the transition
                }
                router.refresh();
            }, 3000);
        }

        const channel = supabase
            .channel(`family-updates-${familyId}-${currentUserId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "families",
                    filter: `id=eq.${familyId}`,
                },
                (payload) => {
                    const nextPartnerId = payload.new && "user_2_id" in payload.new ? payload.new.user_2_id : null;
                    const previousPartnerId = payload.old && "user_2_id" in payload.old ? payload.old.user_2_id : null;

                    if (!previousPartnerId && nextPartnerId) {
                        void triggerCelebration();
                    }
                }
            )
            .subscribe();

        return () => {
            if (refreshTimeoutRef.current) {
                window.clearTimeout(refreshTimeoutRef.current);
            }
            stageTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
            void supabase.removeChannel(channel);
        };
    }, [currentUserId, familyId, router, supabase]);

    useEffect(() => {
        if (initialFunds.length) {
            useFundsStore.getState().setFunds(initialFunds);
        }
    }, [initialFunds]);

    useEffect(() => {
        if (!personalFunds.length) return;
        const favoriteId = defaultPersonal?.id ?? personalFunds[0]?.id ?? null;
        if (!userPickedFundRef.current) {
            if (favoriteId) setSelectedFundId(favoriteId);
            return;
        }
        setSelectedFundId((prev) => {
            if (prev && personalFunds.some((f) => f.id === prev)) return prev;
            return favoriteId;
        });
    }, [personalFunds, defaultPersonal?.id]);

    useEffect(() => {
        setPreferredFundId(selectedFund?.id ?? null);
    }, [selectedFund?.id, setPreferredFundId]);

    function openNewExpense() {
        setExpenseToEdit(null);
        setPreferredFundId(selectedFund?.id ?? null);
        setIsExpenseModalOpen(true);
    }

    function openDepositModal() {
        setDepositError("");
        setDepositAmount("");
        setShowDeposit(true);
    }

    function closeDepositModal() {
        setShowDeposit(false);
        setDepositAmount("");
        setDepositError("");
    }

    function openEditFundModal(fund: FamilyFund) {
        setEditingFund(fund);
        setShowFundsMenu(false);
        setShowCreateFundModal(true);
    }

    function openFundTransfer() {
        if (!selectedFund?.id) return;
        setTransferFromFundId(selectedFund.id);
        setShowFundsMenu(false);
        setShowFundTransfer(true);
    }

    function handleDepositConfirm(nextValue?: string) {
        const normalizedAmount = Number((nextValue ?? depositAmount).replace(/,/g, ".").trim());

        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
            setDepositError("Ingresa un monto válido.");
            return;
        }
        if (!selectedFund?.id) {
            setDepositError("Elige un bolsillo.");
            return;
        }

        setDepositError("");
        startDepositTransition(async () => {
            try {
                await depositToFundAction({
                    fundId: selectedFund.id,
                    amount: normalizedAmount,
                    concept: "Aporte personal",
                });
                closeDepositModal();
                const { syncFamilyExpenses } = await import("@/lib/realtimeFamily");
                await syncFamilyExpenses();
                const { requestFirstMoveCelebrationCheck } = await import(
                    "@/components/PartnerFirstMoveCelebration"
                );
                requestFirstMoveCelebrationCheck();
            } catch (err) {
                setDepositError(err instanceof Error ? err.message : "No se pudo registrar el aporte.");
            }
        });
    }

    return (
        <div
            className={`relative flex h-dvh flex-col overflow-hidden bg-page-gradient transition-all duration-1000 ${
                isPartnerJoining ? "scale-[0.97] opacity-25 blur-[2px] saturate-50" : "scale-100 opacity-100"
            }`}
        >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-page-glow" />

            <header className="relative z-50 flex w-full shrink-0 items-center justify-between px-4 pb-1.5 pt-[max(0.75rem,var(--safe-top))]">
                <Link
                    href="/profile"
                    className="flex min-w-0 items-center gap-2.5 text-left"
                >
                    <div className="h-9 w-9 overflow-hidden rounded-full border border-outline-variant/30 bg-surface-lowest shadow-sm">
                        {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img className="h-full w-full object-cover" src={avatarUrl} alt={displayName} />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-primary-container text-xs font-medium text-on-primary-container">
                                {getInitials(displayName)}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] font-light text-on-surface-variant">
                            Hola de nuevo · Tu espacio
                        </p>
                        <p className="truncate text-[15px] font-medium tracking-tight text-on-surface">
                            {getFirstName(displayName)}
                        </p>
                    </div>
                </Link>
                <div className="flex items-center gap-1.5">
                    <PremiumHeaderChip
                        entitlement={entitlement}
                        isPremiumFallback={storePremium}
                    />
                </div>
            </header>

            <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 min-h-0 flex-col gap-[clamp(0.75rem,2.5dvh,1.25rem)] overflow-hidden px-4 pb-[var(--fab-clearance)] pt-1">
                <HouseholdStatusBanner entitlement={entitlement} />
                <section className="relative shrink-0" data-tour="dash-balance">
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
                                        {heroTitle}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowFundsMenu((open) => !open)}
                                    className="icon-chip-fund icon-chip-coin relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform active:scale-95"
                                    style={fundIconChipStyle(heroColor)}
                                    aria-label="Seleccionar bolsillo"
                                    aria-expanded={showFundsMenu}
                                >
                                    <Wallet size={20} strokeWidth={2.2} />
                                </button>
                            </div>
                        </div>

                        <div className="relative z-10 mt-4 flex items-center gap-2.5">
                            <p
                                className={`text-[2.65rem] font-light leading-none tracking-tight ${
                                    Math.round((displayBalance || 0) * 100) / 100 < 0
                                        ? "text-[#8B5A2B]/90 dark:text-[#C4A574]/90"
                                        : "text-on-surface"
                                }`}
                            >
                                {balanceVisible ? <FormattedCurrency value={displayBalance} /> : "••••••"}
                            </p>
                            <button
                                type="button"
                                onClick={() => setBalanceVisible((v) => !v)}
                                className="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-glass-soft"
                                aria-label={balanceVisible ? "Ocultar saldo" : "Mostrar saldo"}
                            >
                                {balanceVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        </div>
                    </div>

                    {showFundsMenu && (
                        <>
                            <button
                                type="button"
                                aria-label="Cerrar lista de bolsillos"
                                className="fixed inset-0 z-40 cursor-default"
                                onClick={() => setShowFundsMenu(false)}
                            />
                            <div className="absolute right-4 top-[4.75rem] z-50 flex w-[17.5rem] max-h-[min(70dvh,calc(100dvh-4.75rem-var(--fab-clearance)-1rem))] flex-col overflow-hidden rounded-2xl border-[0.5px] border-outline-variant/25 bg-glass-soft shadow-[0_12px_28px_rgba(43,52,55,0.12)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-1 pt-2">
                                    {personalFunds.length === 0 ? (
                                        <p className="px-3 py-3 text-sm text-on-surface-variant">
                                            Aún no hay bolsillos.
                                        </p>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            {personalFunds.map((fund) => {
                                                const balance = calculateSoloPersonalFundBalance(
                                                    isHydrated && storeExpenses.length > 0
                                                        ? storeExpenses
                                                        : [],
                                                    fund,
                                                    currentUserId,
                                                    defaultPersonal?.id ?? null
                                                );
                                                const isActive = selectedFund?.id === fund.id;
                                                const fundColor = resolveFundUiColor(fund, isDark);
                                                const displayName = personalFundDisplayName(
                                                    fund,
                                                    { primaryId: defaultPersonal?.id ?? null }
                                                );
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
                                                            onClick={() => {
                                                                userPickedFundRef.current = true;
                                                                setSelectedFundId(fund.id);
                                                                setShowFundsMenu(false);
                                                            }}
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
                                                                {balanceVisible
                                                                    ? <FormattedCurrency value={balance} />
                                                                    : "••••"}
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

                <section className="relative shrink-0" data-tour="dash-modules">
                    <div className="grid grid-cols-3 gap-1.5">
                        {[
                            {
                                key: "accounts",
                                label: "Cuentas",
                                href: "/accounts",
                                icon: Landmark,
                                value: hasVisibleAccounts
                                    ? balanceVisible
                                        ? <FormattedCurrency value={accountsVisibleLiquidity} />
                                        : "••••"
                                    : "Abrir",
                            },
                            {
                                key: "savings",
                                label: "Mi ahorro",
                                href: "/savings",
                                icon: PiggyBank,
                                value: "Abrir",
                            },
                            {
                                key: "fixed",
                                label: "Pagos fijos",
                                href: "/fixed-expenses",
                                icon: CalendarClock,
                                value: "Abrir",
                            },
                        ].map(({ key, label, href, icon: Icon, value }) => (
                            <Link
                                key={key}
                                href={href}
                                className="flex min-w-0 items-center gap-1 rounded-xl bg-surface-low px-2.5 py-2 text-left transition-colors hover:bg-surface-container"
                            >
                                <Icon size={11} className="shrink-0 text-on-surface-variant" />
                                <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-on-surface-variant">
                                    {label}
                                </span>
                                <span className="shrink-0 text-[10px] font-medium tabular-nums text-on-surface">
                                    {value}
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="relative shrink-0" data-tour="dash-actions">
                    <h2 className="mb-2 px-1 text-xs font-medium text-on-surface">Acciones rápidas</h2>
                    <div className="grid grid-cols-4 gap-1.5">
                        {[
                            {
                                key: "expense",
                                label: "Gasto",
                                icon: Plus,
                                onClick: openNewExpense,
                                darkFab: true,
                            },
                            {
                                key: "deposit",
                                label: "Cargar bolsillo",
                                icon: Wallet,
                                onClick: openDepositModal,
                                highlight: true,
                            },
                            {
                                key: "transfer",
                                label: "Transferir",
                                icon: ArrowLeftRight,
                                onClick: openFundTransfer,
                            },
                            {
                                key: "budget",
                                label: "Presupuesto",
                                icon: BarChart3,
                                href: "/budget",
                            },
                        ].map(({ key, label, icon: Icon, onClick, href, highlight, darkFab }) => {
                            const inner = (
                                <>
                                    <span
                                        className={`flex h-11 w-11 items-center justify-center rounded-full transition-[background] duration-500 ${
                                            darkFab
                                                ? "fab-accent"
                                                : highlight
                                                  ? "border shadow-[0_6px_14px_rgba(43,52,55,0.06)] backdrop-blur-md"
                                                  : "border border-outline-variant/25 bg-surface-lowest/80 text-on-surface shadow-[0_6px_14px_rgba(43,52,55,0.06)] backdrop-blur-md"
                                        }`}
                                        style={
                                            highlight && !darkFab
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
                                </>
                            );

                            if (href) {
                                return (
                                    <Link
                                        key={key}
                                        href={href}
                                        className="flex flex-col items-center gap-1.5 rounded-xl px-0.5 py-0.5 transition-transform active:scale-95"
                                    >
                                        {inner}
                                    </Link>
                                );
                            }

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={onClick}
                                    className="flex flex-col items-center gap-1.5 rounded-xl px-0.5 py-0.5 transition-transform active:scale-95"
                                >
                                    {inner}
                                </button>
                            );
                        })}
                    </div>
                    <p className="mt-2 px-1 text-center text-[11px] font-light text-on-surface-variant">
                        <Link href="/profile" className="underline-offset-2 hover:underline">
                            Invitar a alguien
                        </Link>
                        {" · opcional"}
                    </p>
                </section>

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
                    </div>

                    <div
                        ref={recentListMeasureRef}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                    <div
                        className={`flex max-h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-glass-border bg-glass shadow-[var(--glass-shadow)] backdrop-blur-md ${
                            transactions.length === 0 ? "flex-1" : "shrink-0"
                        }`}
                    >
                        {transactions.length === 0 ? (
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
                                {currentList.map((tx, index) => {
                                    const isDeposit = tx.category === "deposit";
                                    const storeRow = storeExpenses.find((e) => e.id === tx.id);
                                    const Icon = resolveExpenseCategoryIcon({
                                        category: storeRow?.category ?? tx.category,
                                        categoryId: storeRow?.category_id,
                                        categories: familyCategories,
                                    });
                                    const iconColor = resolveMovementIconColor(
                                        {
                                            amount: tx.amount,
                                            paid_by: storeRow?.paid_by ?? currentUserId,
                                            responsible_for: storeRow?.responsible_for ?? null,
                                            fund_id: storeRow?.fund_id ?? tx.fundId ?? null,
                                            account_id: storeRow?.account_id ?? tx.accountId ?? null,
                                            category: tx.category,
                                        },
                                        colorFunds,
                                        storeAccounts,
                                        currentUserId
                                    );

                                    return (
                                        <div
                                            key={tx.id}
                                            className="group relative flex shrink-0 items-stretch overflow-hidden border-b border-glass-border last:border-0 animate-in slide-in-from-left-8 fade-in duration-500 fill-mode-both"
                                            style={{ animationDelay: `${index * 60}ms` }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setActiveActionId((prev) => (prev === tx.id ? null : tx.id))
                                                }
                                                className={`flex w-full items-center justify-between gap-2.5 px-3.5 py-3.5 text-left transition-colors duration-200 ${
                                                    activeActionId === tx.id ? "bg-glass-soft pr-2" : "bg-transparent"
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
                                                            {tx.concept}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] font-medium uppercase tracking-wide text-outline-variant">
                                                                {tx.tag} · {tx.dateLabel}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <span
                                                    className={`shrink-0 text-[15px] font-medium ${
                                                        isDeposit ? "text-primary" : "text-on-surface"
                                                    }`}
                                                >
                                                    {isDeposit ? "+" : "-"}
                                                    <FormattedCurrency value={tx.amount} />
                                                </span>
                                            </button>

                                            <div
                                                className={`flex flex-col border-l border-outline-variant/20 transition-all duration-300 ease-out overflow-hidden shrink-0 ${
                                                    activeActionId === tx.id
                                                        ? "w-14 opacity-100"
                                                        : "w-0 opacity-0 border-transparent"
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
                                                            category: storeRow?.category ?? tx.category,
                                                            category_id: storeRow?.category_id ?? null,
                                                            paid_by: storeRow?.paid_by ?? currentUserId,
                                                            responsible_for:
                                                                storeRow?.responsible_for ?? null,
                                                            fund_id:
                                                                storeRow?.fund_id ??
                                                                tx.fundId ??
                                                                null,
                                                        });
                                                        setIsExpenseModalOpen(true);
                                                        setActiveActionId(null);
                                                    }}
                                                    className="flex-1 flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-secondary/10 bg-surface/50 transition-colors border-b border-outline-variant/20"
                                                >
                                                    <Edit size={16} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                    }}
                                                    className="flex-1 flex items-center justify-center bg-error/15 text-error transition-colors hover:bg-error/25"
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
                </div>
            </main>

            {isPartnerJoining && (
                <Portal>
                <div className="fixed inset-0 z-[100] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(74,101,73,0.22),transparent_55%),linear-gradient(to_bottom,rgba(248,249,250,0.72),rgba(15,23,42,0.18))] px-6 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute left-1/2 top-[18%] h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-200/35 blur-3xl animate-pulse" />
                        <div className="absolute left-[15%] top-[20%] h-24 w-24 rounded-full border border-glass-border bg-surface-lowest/15 animate-ping" />
                        <div className="absolute right-[12%] top-[24%] h-16 w-16 rounded-full border border-accent/25 bg-accent/10 animate-pulse" />
                    </div>

                    <div className="relative flex h-full items-center justify-center">
                        <div className="w-full max-w-sm rounded-4xl border border-glass-border bg-surface-lowest/88 p-6 text-center shadow-[0_20px_60px_rgba(15,23,42,0.18)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-700">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-primary/10 to-accent/15 text-primary shadow-sm ring-8 ring-primary/10">
                                {transitionStep < 2 ? <Sparkles size={26} /> : <CheckCircle2 size={26} />}
                            </div>

                            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-on-surface-variant">
                                Conexión completada
                            </p>
                            <h3 className="mt-2 text-xl font-bold tracking-tight text-on-surface">
                                {transitionStages[transitionStep]}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                                Estamos transformando tu espacio personal en un entorno compartido, elegante y sincronizado.
                            </p>

                            <div className="mt-5 overflow-hidden rounded-full bg-surface-container">
                                <div
                                    className="h-2 rounded-full bg-linear-to-r from-primary via-primary-container to-accent transition-all duration-700"
                                    style={{ width: `${progressValue}%` }}
                                />
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] font-semibold text-on-surface-variant">
                                {transitionStages.map((stage, index) => (
                                    <div
                                        key={stage}
                                        className={`rounded-2xl px-2 py-2 transition-all duration-500 ${
                                            index <= transitionStep
                                                ? "bg-primary/10 text-primary"
                                                : "bg-surface-low text-outline-variant"
                                        }`}
                                    >
                                        {stage
                                            .replace("Tu pareja se ha unido", "Unión")
                                            .replace("Sincronizando movimientos", "Sync")
                                            .replace("Preparando tablero compartido", "Switch")}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-surface-container px-4 py-2 text-sm font-medium text-on-surface-variant">
                                <LoaderCircle size={16} className="animate-spin text-primary" />
                                Abriendo experiencia compartida
                            </div>
                        </div>
                    </div>
                </div>
                </Portal>
            )}
            <NumericKeypadSheet
                isOpen={showDeposit}
                title={`Cargar ${heroTitle}`}
                subtitle={heroTitle}
                hint="También puedes hacerlo desde Cuentas → Transferir (banco → bolsillo)."
                accentColor={heroColor}
                initialValue={depositAmount || "0"}
                errorMessage={showDeposit ? depositError : undefined}
                onClose={closeDepositModal}
                onValueChange={(value) => setDepositAmount(value)}
                onConfirm={(value) => handleDepositConfirm(value)}
            />

            <FundTransferSheet
                open={showFundTransfer}
                onClose={() => setShowFundTransfer(false)}
                currentUserId={currentUserId}
                fromFundId={transferFromFundId}
                funds={personalFunds}
                onSuccess={async () => {
                    const { syncFamilyExpenses } = await import("@/lib/realtimeFamily");
                    await syncFamilyExpenses();
                    try {
                        const overview = await getFamilyFundsMetaAction();
                        useFundsStore.getState().setFunds(overview.funds);
                    } catch {
                        // keep current list
                    }
                    router.refresh();
                }}
            />

            <FundEditorModal
                open={showCreateFundModal}
                onClose={() => {
                    setShowCreateFundModal(false);
                    setEditingFund(null);
                }}
                editingFund={editingFund}
                createScope="personal"
                defaultLabel="principal"
                onSaved={({ fund, funds }) => {
                    useFundsStore.getState().setFunds(funds);
                    userPickedFundRef.current = true;
                    setSelectedFundId(fund.id);
                }}
            />

            <ProductTour open={dashTour.open} steps={dashTour.steps} onClose={dashTour.close} />
        </div>
    );
}
