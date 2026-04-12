import Link from "next/link";
import {
    Bolt,
    CarFront,
    Coffee,
    ReceiptText,
    Settings,
    ShoppingBag,
    type LucideIcon,
} from "lucide-react";
import type { DashboardBudget, DashboardTransaction } from "@/lib/dashboard";

interface DashboardSoloProps {
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

export default function DashboardSolo({
    userName,
    avatarUrl,
    budget,
    transactions,
}: DashboardSoloProps) {
    const percent = budget.budget > 0 ? Math.min(100, Math.round((budget.spent / budget.budget) * 100)) : 0;

    return (
        <>
            <header className="fixed top-0 z-50 flex w-full items-center justify-between bg-[#F8F9FA]/80 px-6 py-4 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full border border-outline-variant/15 bg-surface-container">
                        {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img alt={userName} className="h-full w-full object-cover" src={avatarUrl} />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-surface-container-high text-sm font-bold text-primary">
                                {getInitials(userName)}
                            </div>
                        )}
                    </div>
                    <span className="text-lg font-bold tracking-tight text-[#2B3437] font-manrope">
                        Financial Sage
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/profile" className="text-[#2B3437]/60 transition-opacity hover:opacity-80">
                        <Settings size={22} />
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-lg px-6 pt-20 pb-32">
                <section className="mb-6">
                    <p className="text-sm tracking-wide text-on-surface-variant font-label">Hola, {userName}</p>
                    <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-on-surface font-headline">
                        Dashboard
                    </h1>
                </section>

                <section className="mb-6">
                    <div className="relative overflow-hidden rounded-lg bg-[#60855c] p-5 shadow-sm">
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <img className="w-full h-full object-cover"
                                data-alt="smooth abstract flowing waves with subtle grain texture and soft organic shapes in light green tones"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDW6rtFa_USq8iJFAxck_vUy7fkvL4vFeNGyLjrw4v_0WmYOmtnLD2okKywR76zx-eW0TBSh0MNnzkEQPI-H1xkOB7yt-A_4D9MHNQ0s6AO7u1f2FDR757IUOe8R5QevfkwpH4LLueHmrnZvx45CaUVa51P5VAXReh-yqj0anDccMrhZNGmqh0ufqpqHtvYQHLM2ydLKfluKZhX3MXMF8g_5DUHgnJAdWxUlx-fiXWlGrNl-LxlbLSzxXSP-qgVWogOyXXuigyn49L3" />
                        </div>
                        <div className="pointer-events-none absolute inset-0 opacity-10">
                            <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.45),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.35),transparent_40%)]" />
                        </div>
                        <div className="relative z-10">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-primary/70 font-label">
                                Resumen de cuenta
                            </span>
                            <div className="mt-2 flex flex-col">
                                <span className="text-sm opacity-90 text-on-primary font-label">Gasto Total</span>
                                <span className="mt-1 text-4xl font-extrabold text-white font-headline">
                                    {formatCurrency(budget.spent)}
                                </span>
                            </div>
                            <div className="mt-4">
                                <div className="mb-2 flex justify-between items-end">
                                    <span className="text-[10px] font-bold text-on-primary/80 font-label">
                                        PRESUPUESTO MENSUAL
                                    </span>
                                    <span className="text-[10px] font-bold text-on-primary font-label">{percent}%</span>
                                </div>
                                <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
                                    <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="mb-4 flex items-center justify-between px-1">
                        <h2 className="text-lg font-bold text-on-surface font-headline">Gastos Recientes</h2>
                        <Link href="/history" className="text-xs font-bold tracking-wider text-primary font-label hover:opacity-70">
                            VER TODO
                        </Link>
                    </div>
                    <div className="flex flex-col gap-2">
                        {transactions.length === 0 ? (
                            <div className="flex items-center justify-between rounded-xl bg-surface-container-lowest p-3">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-primary">
                                        <ReceiptText size={20} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-on-surface font-headline">Sin movimientos</span>
                                        <span className="text-[11px] text-on-surface-variant font-label">Agrega tu primer gasto</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-sm font-extrabold text-on-surface font-headline">{formatCurrency(0)}</span>
                                    <span className="mt-1 rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] text-on-surface-variant font-label">
                                        Nuevo
                                    </span>
                                </div>
                            </div>
                        ) : (
                            transactions.map((tx) => {
                                const Icon = iconMap[tx.iconKey] ?? ReceiptText;

                                return (
                                    <div
                                        key={tx.id}
                                        className="bg-surface-lowest rounded-full shadow-sm p-3 flex items-center justify-between group hover:bg-surface-container-low transition-colors duration-200"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-high text-primary">
                                                <Icon size={20} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-on-surface font-headline">{tx.concept}</span>
                                                <span className="text-[11px] text-on-surface-variant font-label">{tx.dateLabel}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-sm font-extrabold text-on-surface font-headline">
                                                -{formatCurrency(tx.amount)}
                                            </span>
                                            <span
                                                className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-label ${tx.isShared
                                                        ? "bg-primary-container text-primary"
                                                        : "bg-surface-container-high text-on-surface-variant"
                                                    }`}
                                            >
                                                {tx.status}
                                            </span>
                                        </div>
                                    </div>
                //                      <div
                //     className="bg-surface-container-lowest rounded-xl p-3 flex items-center justify-between group hover:bg-surface-container-low transition-colors duration-200">
                //     <div className="flex items-center gap-4">
                //         <div
                //             className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary">
                //             <span className="material-symbols-outlined text-[20px]">directions_car</span>
                //         </div>
                //         <div className="flex flex-col">
                //             <span className="font-headline text-sm font-bold text-on-surface">Uber Trip</span>
                //             <span className="font-label text-[11px] text-on-surface-variant">Ayer, 9:00 AM</span>
                //         </div>
                //     </div>
                //     <div className="flex flex-col items-end">
                //         <span className="font-headline text-sm font-extrabold text-on-surface">-$12.20</span>
                //         <span
                //             className="font-label text-[10px] text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full mt-1">Viaje</span>
                //     </div>
                // </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </main>
        </>
    );
}
