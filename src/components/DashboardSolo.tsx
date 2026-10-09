"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
    BarChart3,
    Bell,
    Bolt,
    CarFront,
    CheckCircle2,
    Coffee,
    Edit,
    Eye,
    EyeOff,
    History,
    LoaderCircle,
    Plus,
    Receipt,
    ReceiptText,
    ShoppingBag,
    Sparkles,
    Trash2,
    Wallet,
    type LucideIcon,
} from "lucide-react";
import { createPersonalDeposit } from "@/app/actions/expenses";
import { useExpenseModal } from "@/components/ExpenseModalProvider";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import ProfileDrawer from "@/components/ProfileDrawer";
import type { DashboardBudget, DashboardTransaction } from "@/lib/dashboard";
import { createClient } from "@/utils/supabase/client";
import { DEFAULT_PERSONAL_FUND_COLOR } from "@/lib/funds";
import { useExpenseStore } from "@/store/useExpenseStore";

interface DashboardSoloProps {
    currentUserId: string;
    familyId: string;
    userName: string;
    avatarUrl?: string | null;
    budget: DashboardBudget;
    transactions: DashboardTransaction[];
    pocketBalance: number;
}

const iconMap: Record<DashboardTransaction["iconKey"], LucideIcon> = {
    "shopping-cart": ShoppingBag,
    coffee: Coffee,
    car: CarFront,
    utensils: ReceiptText,
    receipt: Bolt,
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

function getFirstName(value?: string | null, fallback = "Tú") {
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

export default function DashboardSolo({
    currentUserId,
    familyId,
    userName,
    avatarUrl,
    budget,
    transactions,
    pocketBalance,
}: DashboardSoloProps) {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const { setExpenseToEdit, setIsExpenseModalOpen } = useExpenseModal();
    const isHydrated = useExpenseStore((s) => s.isHydrated);
    const storePocket = useExpenseStore((s) => s.myAvailableFund);
    const refreshData = useExpenseStore((s) => s.refreshData);
    const displayName = userName?.trim() || "Usuario";
    // Real pocket cash — never the hardcoded monthly budget remaining.
    const displayBalance = isHydrated ? storePocket : pocketBalance;
    const percent = budget.budget > 0 ? Math.min(100, Math.round((budget.spent / budget.budget) * 100)) : 0;
    const budgetSpent = Math.round(Number(budget.spent || 0) * 100) / 100;
    const budgetTarget = Math.max(0, Math.round(Number(budget.budget || 0) * 100) / 100);
    const budgetRemaining = Math.max(0, Math.round((budgetTarget - budgetSpent) * 100) / 100);
    const heroColor = DEFAULT_PERSONAL_FUND_COLOR;
    const [activeActionId, setActiveActionId] = useState<string | null>(null);
    const [balanceVisible, setBalanceVisible] = useState(true);
    const [showDeposit, setShowDeposit] = useState(false);
    const [depositAmount, setDepositAmount] = useState("");
    const [depositError, setDepositError] = useState("");
    const [, startDepositTransition] = useTransition();
    const [isPartnerJoining, setIsPartnerJoining] = useState(false);
    const [transitionStep, setTransitionStep] = useState(0);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const hasCelebratedRef = useRef(false);
    const refreshTimeoutRef = useRef<number | null>(null);
    const stageTimeoutsRef = useRef<number[]>([]);
    const currentList = transactions.slice(0, 5);
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
                    colors: ["#4a6549", "#ccebc7", "#d4af37", "#f3e7b3"],
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

    function openNewExpense() {
        setExpenseToEdit(null);
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

    function handleDepositConfirm(nextValue?: string) {
        const normalizedAmount = Number((nextValue ?? depositAmount).replace(/,/g, ".").trim());

        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
            setDepositError("Ingresa un monto válido.");
            return;
        }

        setDepositError("");
        startDepositTransition(async () => {
            try {
                await createPersonalDeposit({ amount: normalizedAmount });
                closeDepositModal();
                await refreshData();
                router.refresh();
            } catch (err) {
                setDepositError(err instanceof Error ? err.message : "No se pudo registrar el aporte.");
            }
        });
    }

    return (
        <div
            className={`relative flex h-dvh flex-col overflow-hidden bg-linear-to-b from-[#f3f5f0] via-[#e8ede4] to-[#d5dfd0] transition-all duration-1000 ${
                isPartnerJoining ? "scale-[0.97] opacity-25 blur-[2px] saturate-50" : "scale-100 opacity-100"
            }`}
        >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(ellipse_at_bottom,_rgba(74,101,73,0.16),_transparent_70%)]" />

            <header className="relative z-50 flex w-full shrink-0 items-center justify-between px-4 pb-1.5 pt-3">
                <button
                    type="button"
                    onClick={() => setIsProfileOpen(true)}
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
                            Hola de nuevo · Santuario personal
                        </p>
                        <p className="truncate text-[15px] font-medium tracking-tight text-on-surface">
                            {getFirstName(displayName)}
                        </p>
                    </div>
                </button>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        className="relative rounded-full border border-outline-variant/30 bg-surface-lowest/80 p-2 text-on-surface-variant shadow-sm backdrop-blur-sm"
                        aria-label="Notificaciones"
                    >
                        <Bell size={16} />
                    </button>
                </div>
            </header>

            <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 min-h-0 flex-col overflow-hidden px-4 pt-1">
                <section className="relative mb-3 shrink-0">
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
                                    Mi bolsillo
                                </p>
                            </div>
                        </div>

                        <div className="relative z-10 mt-4 flex items-center gap-2.5">
                            <p
                                className={`text-[2.65rem] font-light leading-none tracking-tight ${
                                    Math.round((displayBalance || 0) * 100) / 100 < 0
                                        ? "text-red-600"
                                        : "text-on-surface"
                                }`}
                            >
                                {balanceVisible ? formatCurrency(displayBalance) : "••••••"}
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
                                onClick={openDepositModal}
                                className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container"
                            >
                                <span
                                    className="h-2 w-2 rounded-full"
                                    style={{ backgroundColor: heroColor }}
                                />
                                Mi fondo · {balanceVisible ? formatCurrency(displayBalance) : "••••"}
                            </button>
                            <Link
                                href="/budget"
                                className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container"
                            >
                                Presupuesto · {percent}%
                                {balanceVisible ? ` · queda ${formatCurrency(budgetRemaining)}` : ""}
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="relative mb-3 shrink-0">
                    <h2 className="mb-2 px-1 text-xs font-medium text-on-surface">Acciones rápidas</h2>
                    <div className="grid grid-cols-4 gap-1.5">
                        {[
                            {
                                key: "deposit",
                                label: "Aportar",
                                icon: Wallet,
                                onClick: openDepositModal,
                                highlight: true,
                            },
                            {
                                key: "expense",
                                label: "Gasto",
                                icon: Plus,
                                onClick: openNewExpense,
                            },
                            {
                                key: "budget",
                                label: "Presupuesto",
                                icon: BarChart3,
                                href: "/budget",
                            },
                            {
                                key: "history",
                                label: "Historial",
                                icon: History,
                                href: "/history",
                            },
                        ].map(({ key, label, icon: Icon, onClick, href, highlight }) => {
                            const inner = (
                                <>
                                    <span
                                        className={`flex h-11 w-11 items-center justify-center rounded-full shadow-[0_6px_14px_rgba(43,52,55,0.06)] backdrop-blur-md ${
                                            highlight
                                                ? ""
                                                : "border border-outline-variant/25 bg-surface-lowest/80 text-on-surface-variant"
                                        }`}
                                        style={
                                            highlight
                                                ? {
                                                      backgroundImage: `linear-gradient(145deg, rgba(255,255,255,0.72) 0%, ${heroColor}18 55%, ${heroColor}28 100%)`,
                                                      color: heroColor,
                                                      border: `1px solid ${heroColor}40`,
                                                  }
                                                : undefined
                                        }
                                    >
                                        <Icon size={18} />
                                    </span>
                                    <span className="text-[10px] font-medium text-on-surface-variant">{label}</span>
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
                </section>

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
                    </div>

                    <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white/60 bg-surface-lowest/40 shadow-[0_10px_24px_rgba(43,52,55,0.06)] backdrop-blur-2xl">
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
                                {currentList.map((tx, index) => {
                                    const Icon = iconMap[tx.iconKey] ?? ReceiptText;

                                    return (
                                        <div
                                            key={tx.id}
                                            className="group relative flex min-h-0 flex-1 items-stretch overflow-hidden border-b border-white/40 last:border-0 animate-in slide-in-from-left-8 fade-in duration-500 fill-mode-both"
                                            style={{ animationDelay: `${index * 60}ms` }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setActiveActionId((prev) => (prev === tx.id ? null : tx.id))
                                                }
                                                className={`flex h-full w-full items-center justify-between gap-2.5 px-3.5 text-left transition-colors duration-200 ${
                                                    activeActionId === tx.id ? "bg-white/40 pr-2" : "bg-transparent"
                                                }`}
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div
                                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm backdrop-blur-md"
                                                        style={{
                                                            backgroundColor: `${heroColor}18`,
                                                            borderColor: `${heroColor}35`,
                                                            color: heroColor,
                                                        }}
                                                    >
                                                        <Icon size={15} />
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

                                                <span className="shrink-0 text-[15px] font-medium text-on-surface">
                                                    -{formatCurrency(tx.amount)}
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

            {isPartnerJoining && (
                <div className="fixed inset-0 z-120 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(74,101,73,0.22),transparent_55%),linear-gradient(to_bottom,rgba(248,249,250,0.72),rgba(15,23,42,0.18))] px-6 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute left-1/2 top-[18%] h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-200/35 blur-3xl animate-pulse" />
                        <div className="absolute left-[15%] top-[20%] h-24 w-24 rounded-full border border-white/40 bg-surface-lowest/15 animate-ping" />
                        <div className="absolute right-[12%] top-[24%] h-16 w-16 rounded-full border border-accent/25 bg-accent/10 animate-pulse" />
                    </div>

                    <div className="relative flex h-full items-center justify-center">
                        <div className="w-full max-w-sm rounded-4xl border border-white/70 bg-surface-lowest/88 p-6 text-center shadow-[0_20px_60px_rgba(15,23,42,0.18)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-700">
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
            )}
            <NumericKeypadSheet
                isOpen={showDeposit}
                title="Aportar a mi fondo"
                subtitle="Mi fondo"
                accentColor={DEFAULT_PERSONAL_FUND_COLOR}
                initialValue={depositAmount || "0"}
                errorMessage={showDeposit ? depositError : undefined}
                onClose={closeDepositModal}
                onValueChange={(value) => setDepositAmount(value)}
                onConfirm={(value) => handleDepositConfirm(value)}
            />
            <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </div>
    );
}
