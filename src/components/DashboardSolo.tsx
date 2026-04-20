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
                    colors: ["#60855c", "#8BA888", "#d4af37", "#f3e7b3"],
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

    return (
        <div className="relative">
            <header className="fixed top-0 z-50 flex w-full items-center justify-between bg-[#F8F9FA]/80 px-6 py-4 backdrop-blur-md transition-opacity duration-500">
                <button
                    type="button"
                    onClick={() => setIsProfileOpen(true)}
                    className="flex items-center gap-3 cursor-pointer"
                >
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
                </button>

                <button
                    type="button"
                    onClick={() => setIsProfileOpen(true)}
                    className="text-[#2B3437]/60 transition-opacity hover:opacity-80"
                >
                    <Settings size={22} />
                </button>
            </header>

            <main className={`mx-auto flex h-dvh max-w-md flex-col overflow-hidden px-4 pt-20 pb-24 transition-all duration-1000 ${
                isPartnerJoining ? "scale-[0.97] opacity-25 blur-[2px] saturate-50" : "scale-100 opacity-100"
            }`}>
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

            {isPartnerJoining && (
                <div className="fixed inset-0 z-120 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(96,133,92,0.22),_transparent_55%),linear-gradient(to_bottom,_rgba(248,249,250,0.72),_rgba(15,23,42,0.18))] px-6 backdrop-blur-md animate-in fade-in duration-500">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute left-1/2 top-[18%] h-56 w-56 -translate-x-1/2 rounded-full bg-emerald-200/35 blur-3xl animate-pulse" />
                        <div className="absolute left-[15%] top-[20%] h-24 w-24 rounded-full border border-white/40 bg-white/15 animate-ping" />
                        <div className="absolute right-[12%] top-[24%] h-16 w-16 rounded-full border border-amber-200/50 bg-amber-100/20 animate-pulse" />
                    </div>

                    <div className="relative flex h-full items-center justify-center">
                        <div className="w-full max-w-sm rounded-4xl border border-white/70 bg-white/88 p-6 text-center shadow-[0_20px_60px_rgba(15,23,42,0.18)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-700">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-emerald-50 to-amber-50 text-[#60855c] shadow-sm ring-8 ring-emerald-50/70">
                                {transitionStep < 2 ? <Sparkles size={26} /> : <CheckCircle2 size={26} />}
                            </div>

                            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">
                                Conexión completada
                            </p>
                            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-800">
                                {transitionStages[transitionStep]}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                Estamos transformando tu espacio personal en un entorno compartido, elegante y sincronizado.
                            </p>

                            <div className="mt-5 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-2 rounded-full bg-linear-to-r from-[#60855c] via-[#8BA888] to-[#d4af37] transition-all duration-700"
                                    style={{ width: `${progressValue}%` }}
                                />
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-500">
                                {transitionStages.map((stage, index) => (
                                    <div
                                        key={stage}
                                        className={`rounded-2xl px-2 py-2 transition-all duration-500 ${
                                            index <= transitionStep
                                                ? "bg-emerald-50 text-[#60855c]"
                                                : "bg-slate-50 text-slate-400"
                                        }`}
                                    >
                                        {stage.replace("Tu pareja se ha unido", "Unión").replace("Sincronizando movimientos", "Sync").replace("Preparando tablero compartido", "Switch")}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
                                <LoaderCircle size={16} className="animate-spin text-[#60855c]" />
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
