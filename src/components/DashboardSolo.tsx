"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Bolt,
    CarFront,
    Coffee,
    Edit,
    CheckCircle2,
    ChevronRight,
    LoaderCircle,
    ReceiptText,
    Settings,
    ShoppingBag,
    Sparkles,
    Trash2,
    type LucideIcon,
} from "lucide-react";
import { useExpenseModal } from "@/components/ExpenseModalProvider";
import ProfileDrawer from "@/components/ProfileDrawer";
import type { DashboardBudget, DashboardTransaction } from "@/lib/dashboard";
import { createClient } from "@/utils/supabase/client";

interface DashboardSoloProps {
    currentUserId: string;
    familyId: string;
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
    currentUserId,
    familyId,
    userName,
    avatarUrl,
    budget,
    transactions,
}: DashboardSoloProps) {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const { setExpenseToEdit, setIsExpenseModalOpen } = useExpenseModal();
    const displayName = userName?.trim() || "Tomás García";
    const displayBalance = budget.available;
    const percent = budget.budget > 0 ? Math.min(100, Math.round((budget.spent / budget.budget) * 100)) : 0;
    const budgetSpent = Math.round(Number(budget.spent || 0) * 100) / 100;
    const budgetTarget = Math.max(0, Math.round(Number(budget.budget || 0) * 100) / 100);
    const [activeActionId, setActiveActionId] = useState<string | null>(null);
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

    return (
        <div className="relative">
            <header className="fixed top-0 z-50 flex h-14 w-full items-center justify-between bg-surface/80 px-4 backdrop-blur-md transition-opacity duration-500 border-b border-outline-variant/30">
                <button
                    type="button"
                    onClick={() => setIsProfileOpen(true)}
                    className="flex items-center gap-3 cursor-pointer"
                >
                    <div className="h-9 w-9 overflow-hidden rounded-full border-2 border-primary/20 bg-surface-container">
                        {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt={displayName} className="h-full w-full object-cover" src={avatarUrl} />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-primary-container text-sm font-bold text-on-primary-container">
                                {getInitial(displayName)}
                            </div>
                        )}
                    </div>

                    <span className="text-base font-bold text-on-surface font-headline">SinDescuadre</span>
                </button>

                <button
                    type="button"
                    onClick={() => setIsProfileOpen(true)}
                    className="text-on-surface/60 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 rounded-full p-1"
                >
                    <Settings size={22} />
                </button>
            </header>

            <main className={`mx-auto flex h-dvh max-w-md flex-col overflow-hidden px-4 pt-20 pb-24 transition-all duration-1000 ${
                isPartnerJoining ? "scale-[0.97] opacity-25 blur-[2px] saturate-50" : "scale-100 opacity-100"
            }`}>
                <section className="mb-4 shrink-0 px-2">
                    <h1 className="text-2xl font-semibold tracking-tight text-on-surface">{displayName}</h1>
                    <p className="text-sm font-normal opacity-70 text-on-surface-variant font-label">
                        Santuario personal • Hoy
                    </p>
                </section>

                <section className="mb-2">
                    <div className="grid grid-cols-2 mb-6 shrink-0 rounded-3xl shadow-sm border border-outline-variant/30 overflow-hidden">
                        {/* TARJETA 1: MI BOLSILLO (SECONDARY) */}
                        <div className="relative flex flex-col justify-between min-h-41 bg-secondary/40 p-4 border-r border-outline-variant/30">
                            <div className="absolute inset-0 z-0 opacity-60 mix-blend-multiply pointer-events-none bg-[url('/waves3.svg')] bg-cover bg-center" />
                            <div className="relative z-10 flex flex-col">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-lowest/70 text-secondary mb-2 backdrop-blur-sm shadow-sm">
                                    <ReceiptText size={16} />
                                </div>
                                <span className="text-[10px] font-normal text-white uppercase tracking-widest">Mi bolsillo</span>
                                <p className="mt-0.5 text-2xl font-semibold tracking-tight text-white">
                                    {formatCurrency(displayBalance)}
                                </p>
                                <p className="mt-0.5 text-[10px] font-medium text-secondary/80">
                                    Libre este mes
                                </p>
                            </div>

                            <div className="relative z-10 mt-4">
                                <button
                                    type="button"
                                    onClick={openNewExpense}
                                    className="w-full rounded-full bg-surface-lowest/90 py-2 text-xs font-bold text-secondary transition-all hover:bg-surface-lowest shadow-sm backdrop-blur-sm"
                                >
                                    Registrar gasto
                                </button>
                            </div>
                        </div>

                        {/* TARJETA 2: PRESUPUESTO (PRIMARY) */}
                        <div className="relative flex flex-col justify-between min-h-41 bg-primary/50 p-4">
                            <div className="absolute inset-0 z-0 opacity-60 mix-blend-multiply pointer-events-none bg-[url('/waves3.svg')] bg-cover bg-center" />
                            <div className="relative z-10 flex flex-col">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-lowest/70 text-primary mb-2 backdrop-blur-sm shadow-sm">
                                    <Sparkles size={16} />
                                </div>
                                <span className="text-[10px] font-normal text-white uppercase tracking-widest">Presupuesto</span>
                                <p className="mt-0.5 text-2xl font-semibold tracking-tight text-white">
                                    {percent}%
                                </p>
                                <p className="mt-0.5 text-[10px] font-medium text-outline-variant">
                                    {formatCurrency(budgetSpent)} / {formatCurrency(budgetTarget)}
                                </p>
                            </div>

                            <div className="relative z-10 mt-4">
                                <Link
                                    href="/budget"
                                    className="block w-full rounded-full bg-surface-lowest/90 py-2 text-center text-xs font-bold text-primary transition-all hover:bg-surface-lowest shadow-sm backdrop-blur-sm"
                                >
                                    Ver detalle
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="flex-1 flex flex-col min-h-0 mb-24 px-2">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-baseline gap-3">
                            <h3 className="text-md font-semibold text-on-surface">Actividad</h3>
                            <Link
                                href="/history"
                                className="flex items-center text-[10px] font-bold tracking-widest text-primary opacity-70 hover:opacity-100 transition-opacity"
                            >
                                Ver todo <ChevronRight size={12} className="ml-0.5" />
                            </Link>
                        </div>
                    </div>

                    <div className="flex-1 bg-surface-lowest rounded-3xl shadow-sm flex flex-col overflow-hidden">
                        {currentList.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full animate-in fade-in duration-1000">
                                <div className="relative mb-5 flex items-center justify-center">
                                    <div className="absolute inset-0 rounded-full bg-primary opacity-10 animate-ping duration-1000" />
                                    <div className="absolute inset-0 rounded-full bg-primary opacity-20 animate-pulse" />

                                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-emerald-100/50 bg-emerald-50 text-primary shadow-sm">
                                        <ReceiptText size={36} strokeWidth={1.5} />
                                    </div>
                                </div>

                                <h4 className="mb-2 text-lg font-bold text-on-surface">Todo está tranquilo</h4>
                                <p className="max-w-55 text-xs leading-relaxed text-outline-variant">
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
                                            className={`relative flex items-stretch border-b border-outline-variant/15 last:border-0 bg-surface-lowest overflow-hidden group ${
                                                currentList.length >= 5 ? 'flex-1' : ''
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setActiveActionId((prev) => (prev === tx.id ? null : tx.id))}
                                                className={`flex items-center justify-between px-4 transition-all duration-300 ease-out w-full text-left ${
                                                    currentList.length >= 5 ? 'h-full' : 'py-4'
                                                } ${
                                                    activeActionId === tx.id ? 'scale-[1] bg-surface pr-2 inset-shadow-zinc-700' : 'scale-100 bg-surface-lowest'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-800/10 border border-outline-variant/20 flex items-center justify-center text-on-surface-variant shrink-0 shadow-sm">
                                                        <Icon size={18} />
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-on-surface">{tx.concept}</span>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[10px] font-medium text-outline-variant uppercase tracking-wide">
                                                                {tx.tag} • {tx.dateLabel}
                                                            </span>
                                                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${
                                                                tx.isShared ? 'bg-secondary/10 text-secondary' : 'bg-emerald-50 text-emerald-600'
                                                            }`}>
                                                                {tx.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <span className="text-base font-bold shrink-0 text-on-surface">
                                                    -{formatCurrency(tx.amount)}
                                                </span>
                                            </button>

                                            <div
                                                className={`flex flex-col border-l border-outline-variant/20 transition-all duration-300 ease-out overflow-hidden shrink-0 ${
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
                                        {stage.replace("Tu pareja se ha unido", "Unión").replace("Sincronizando movimientos", "Sync").replace("Preparando tablero compartido", "Switch")}
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
            <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </div>
    );
}
