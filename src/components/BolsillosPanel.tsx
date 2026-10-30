"use client";

import { FormattedCurrency } from "@/components/FormattedCurrency";
import FundsPanel from "@/components/FundsPanel";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { Sheet } from "@/components/ui/Sheet";
import {
  depositToFundAction,
  getBolsillosBalanceAction,
  transferBetweenFundsAction,
  type BolsillosBalanceOverview,
  type BolsillosFundRow,
} from "@/app/actions/funds";
import { useCurrency } from "@/hooks/useCurrency";
import { useIsDark } from "@/hooks/useIsDark";
import { tintedGlassGradient } from "@/lib/glass";
import { isIndividualHousehold } from "@/lib/household";
import {
  DEFAULT_SHARED_FUND_COLOR,
  fundIconChipStyle,
  resolveFundUiColor,
} from "@/lib/funds";
import {
  buildFundStoryCopy,
  shiftMonthKey,
} from "@/lib/funds-balance";
import {
  ArrowLeftRight,
  ChartColumn,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type TabId = "balance" | "admin";

interface BolsillosPanelProps {
  currentUserId: string;
  familyMemberCount?: number;
}

const ACCENT = DEFAULT_SHARED_FUND_COLOR;

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "balance", label: "Balance" },
  { id: "admin", label: "Administrar" },
];

function deltaSpendCopy(
  delta: number,
  prevEmpty: boolean,
  thisMonth: number,
  formatCurrency: (n: number) => string,
  pct: number | null
) {
  if (prevEmpty) {
    return thisMonth > 0
      ? "Primer mes con gasto en bolsillos"
      : "Sin gasto este mes ni el anterior";
  }
  if (Math.abs(delta) < 0.01) return "Igual que el mes pasado";
  const abs = formatCurrency(Math.abs(delta));
  const pctLabel = pct != null ? ` · ${Math.abs(pct)}%` : "";
  return delta > 0
    ? `${abs} más que el mes pasado${pctLabel}`
    : `${abs} menos que el mes pasado${pctLabel}`;
}

function formatShortDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" }).format(date);
}

function DeltaIcon({ delta, prevEmpty }: { delta: number; prevEmpty: boolean }) {
  if (prevEmpty || Math.abs(delta) < 0.01) {
    return <Wallet size={15} strokeWidth={1.75} className="text-on-surface-variant" />;
  }
  if (delta > 0) {
    return <TrendingUp size={15} strokeWidth={1.75} className="text-amber-800/70 dark:text-amber-200/80" />;
  }
  return <TrendingDown size={15} strokeWidth={1.75} className="text-emerald-800/70 dark:text-emerald-200/80" />;
}

export default function BolsillosPanel({
  currentUserId,
  familyMemberCount = 1,
}: BolsillosPanelProps) {
  const isIndividual = isIndividualHousehold(familyMemberCount);
  const { format: formatCurrency } = useCurrency();
  const isDark = useIsDark();
  const router = useRouter();

  const [tab, setTab] = useState<TabId>("balance");
  const [overview, setOverview] = useState<BolsillosBalanceOverview | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [detail, setDetail] = useState<BolsillosFundRow | null>(null);
  const [detailMonthKey, setDetailMonthKey] = useState<string>("");
  const [showDetailFilter, setShowDetailFilter] = useState(false);
  const [showEvolution, setShowEvolution] = useState(false);
  const [detailPayerId, setDetailPayerId] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  const [depositFundId, setDepositFundId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("0");
  const [showDepositKeypad, setShowDepositKeypad] = useState(false);

  const [showTransfer, setShowTransfer] = useState(false);
  const [fromFundId, setFromFundId] = useState("");
  const [toFundId, setToFundId] = useState("");
  const [transferAmount, setTransferAmount] = useState("0");
  const [showTransferKeypad, setShowTransferKeypad] = useState(false);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const data = await getBolsillosBalanceAction();
      setOverview(data);
      setFromFundId((prev) => prev || data.sharedDefaultFundId || data.funds[0]?.fund.id || "");
      setToFundId((prev) => prev || data.personalFundId || data.funds[1]?.fund.id || "");
      setDetail((prev) => {
        if (!prev) return null;
        return data.funds.find((f) => f.fund.id === prev.fund.id) ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los bolsillos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!detail) {
      setDetailMonthKey("");
      return;
    }
    const preferred =
      overview?.monthKey ||
      detail.history[0]?.monthKey ||
      "";
    setDetailMonthKey(preferred);
  }, [detail?.fund.id, overview?.monthKey]);

  const detailColor = detail ? resolveFundUiColor(detail.fund, isDark) : ACCENT;

  const detailHistory = detail?.history ?? [];
  const selectedHistory = useMemo(
    () => detailHistory.find((h) => h.monthKey === detailMonthKey) ?? detailHistory[0],
    [detailHistory, detailMonthKey]
  );
  const prevHistorySpent = useMemo(() => {
    if (!detailMonthKey) return 0;
    const prevKey = shiftMonthKey(detailMonthKey, -1);
    return detailHistory.find((h) => h.monthKey === prevKey)?.spent ?? 0;
  }, [detailHistory, detailMonthKey]);

  const memberOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const point of detailHistory) {
      for (const payer of point.byPayer ?? []) {
        map.set(payer.profileId, payer.name);
      }
    }
    for (const movement of detail?.movements ?? []) {
      if (movement.paid_by) {
        map.set(movement.paid_by, movement.payerName || "Alguien");
      }
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => {
        if (a.id === currentUserId) return -1;
        if (b.id === currentUserId) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [detailHistory, detail?.movements, currentUserId]);

  const selectedMemberName =
    detailPayerId == null
      ? null
      : memberOptions.find((m) => m.id === detailPayerId)?.name ?? null;

  const displaySpent = useMemo(() => {
    if (!selectedHistory) return 0;
    if (!detailPayerId) return selectedHistory.spent;
    return (
      selectedHistory.byPayer?.find((p) => p.profileId === detailPayerId)?.amount ?? 0
    );
  }, [selectedHistory, detailPayerId]);

  const detailStory = useMemo(() => {
    if (!selectedHistory) return null;
    if (detailPayerId && selectedMemberName) {
      return buildFundStoryCopy({
        spent: displaySpent,
        prevSpent: 0,
        monthLabel: selectedHistory.monthLabel,
        formatCurrency,
        isCouple: false,
      });
    }
    return buildFundStoryCopy({
      spent: selectedHistory.spent,
      prevSpent: prevHistorySpent,
      monthLabel: selectedHistory.monthLabel,
      formatCurrency,
      isCouple: false,
    });
  }, [
    selectedHistory,
    prevHistorySpent,
    formatCurrency,
    detailPayerId,
    selectedMemberName,
    displaySpent,
  ]);

  const monthMovements = useMemo(() => {
    if (!detail || !detailMonthKey) return [];
    return detail.movements.filter((m) => {
      if ((m.expense_date ?? "").slice(0, 7) !== detailMonthKey) return false;
      if (detailPayerId && m.paid_by !== detailPayerId) return false;
      return true;
    });
  }, [detail, detailMonthKey, detailPayerId]);

  const historyMaxSpent = useMemo(() => {
    let max = 0;
    for (const point of detailHistory) {
      if (point.spent > max) max = point.spent;
    }
    return max;
  }, [detailHistory]);

  const filterActive =
    (overview?.monthKey != null && detailMonthKey !== overview.monthKey) ||
    showEvolution;

  function openDetail(row: BolsillosFundRow) {
    setDetail(row);
    setDetailMonthKey(overview?.monthKey || row.history[0]?.monthKey || "");
    setShowEvolution(false);
    setDetailPayerId(null);
    setShowDetailFilter(false);
  }

  function openDeposit(fundId: string) {
    setDepositFundId(fundId);
    setDepositAmount("0");
    setShowDepositKeypad(true);
  }

  function confirmDeposit(nextValue?: string) {
    const amount = Number((nextValue ?? depositAmount).replace(/,/g, ".").trim());
    if (!depositFundId || !Number.isFinite(amount) || amount <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await depositToFundAction({ fundId: depositFundId, amount });
        setShowDepositKeypad(false);
        setDepositFundId(null);
        await refresh();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo aportar.");
      }
    });
  }

  function confirmTransfer(nextValue?: string) {
    const amount = Number((nextValue ?? transferAmount).replace(/,/g, ".").trim());
    if (!fromFundId || !toFundId || !Number.isFinite(amount) || amount <= 0) {
      setError("Completa origen, destino e importe.");
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        await transferBetweenFundsAction({ fromFundId, toFundId, amount });
        setShowTransferKeypad(false);
        setShowTransfer(false);
        setTransferAmount("0");
        await refresh();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo transferir.");
      }
    });
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-y-auto overscroll-y-contain no-scrollbar bg-page-gradient text-on-surface">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56"
        style={{
          backgroundImage: `radial-gradient(ellipse at bottom, ${ACCENT}24, transparent 72%)`,
        }}
      />

      <header className="relative z-20 mx-auto flex w-full max-w-md shrink-0 items-center px-4 pb-1.5 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[11px] font-light text-on-surface-variant">
            {isIndividual ? "Tu gasto del mes" : "Espacio familiar"}
          </p>
          <h1 className="truncate text-[15px] font-medium tracking-tight text-on-surface">
            Bolsillos
          </h1>
        </div>
      </header>

      <div className="relative z-20 mx-auto w-full max-w-md shrink-0 px-4 pb-3">
        <div
          className="grid grid-cols-2 gap-1 rounded-2xl border border-glass-border bg-glass-soft p-1 backdrop-blur-md"
          role="tablist"
          aria-label="Sección de bolsillos"
        >
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`rounded-xl px-3 py-2 text-[12px] font-medium tracking-tight transition-colors ${
                  active
                    ? "bg-surface-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && !overview ? (
        <div className="relative z-10 flex flex-1 items-center justify-center px-4 text-sm text-on-surface-variant">
          Cargando bolsillos…
        </div>
      ) : tab === "admin" ? (
        <main className="relative z-10 mx-auto w-full max-w-md flex-1 px-4 pb-[var(--fab-clearance)] pt-1">
          {error ? (
            <p className="alert-error mb-3 rounded-2xl px-4 py-3 text-sm">{error}</p>
          ) : null}
          <p className="mb-4 px-0.5 text-[13px] font-light leading-relaxed text-on-surface-variant">
            Crea, aporta o transfiere. La cuenta es el banco; el bolsillo organiza el gasto del
            mes.
          </p>
          <FundsPanel
            currentUserId={currentUserId}
            familyMemberCount={familyMemberCount}
            embedded
          />
        </main>
      ) : (
        <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-[var(--fab-clearance)] pt-1">
          {error ? (
            <p className="alert-error rounded-2xl px-4 py-3 text-sm">{error}</p>
          ) : null}

          <section
            className="relative overflow-hidden rounded-[1.85rem] border border-glass-border p-5 shadow-[0_14px_40px_rgba(43,52,55,0.10)] backdrop-blur-2xl"
            style={{
              backgroundImage: tintedGlassGradient(ACCENT, {
                soft: true,
                midAlpha: "22",
                endAlpha: "34",
                midStop: 52,
              }),
            }}
          >
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-light text-on-surface-variant">
                  Queda en total
                </p>
                <p className="mt-0.5 text-[13px] font-light text-on-surface/70">
                  {overview?.monthLabel}
                </p>
              </div>
              <div
                className="icon-chip-fund icon-chip-coin flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border"
                style={fundIconChipStyle(ACCENT)}
              >
                <Wallet size={20} strokeWidth={1.75} />
              </div>
            </div>

            <p
              className={`relative z-10 mt-4 text-[2.65rem] font-light leading-none tracking-tight tabular-nums ${
                (overview?.totalRemaining ?? 0) < 0
                  ? "text-balance-negative"
                  : "text-on-surface"
              }`}
            >
              <FormattedCurrency value={overview?.totalRemaining ?? 0} />
            </p>
            <p className="relative z-10 mt-2 text-[12px] font-light text-on-surface-variant">
              Gastado este mes{" "}
              <span className="tabular-nums text-on-surface/80">
                <FormattedCurrency value={overview?.totalSpentThisMonth ?? 0} />
              </span>
            </p>

            <div className="relative z-10 mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowCompare(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-low/90 px-3 py-1.5 text-xs font-medium text-on-surface backdrop-blur-sm transition-colors hover:bg-surface-container"
              >
                <ChartColumn size={12} strokeWidth={2} />
                Comparativa
              </button>
              <button
                type="button"
                onClick={() => setShowTransfer(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-low/70 px-3 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              >
                <ArrowLeftRight size={12} strokeWidth={2} />
                Transferir
              </button>
              <button
                type="button"
                onClick={() => setTab("admin")}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-low/70 px-3 py-1.5 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              >
                <Plus size={12} strokeWidth={2} />
                Administrar
              </button>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-baseline justify-between gap-3 px-0.5">
              <h2 className="text-[13px] font-medium tracking-tight text-on-surface">
                Por bolsillo
              </h2>
              <p className="text-[11px] font-light text-on-surface-variant">
                Gastado · Queda
              </p>
            </div>

            {(overview?.funds.length ?? 0) === 0 ? (
              <div className="rounded-[1.35rem] border border-dashed border-outline-variant/35 px-5 py-7 text-center">
                <p className="text-[13px] font-medium text-on-surface">
                  Aún no hay bolsillos de gasto
                </p>
                <p className="mt-1 text-[12px] font-light text-on-surface-variant">
                  Crea uno en Administrar para organizar el mes.
                </p>
                <button
                  type="button"
                  onClick={() => setTab("admin")}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-surface-low px-3.5 py-1.5 text-xs font-medium text-on-surface"
                >
                  <Plus size={12} />
                  Ir a Administrar
                </button>
              </div>
            ) : (
              <ul className="overflow-hidden rounded-[1.35rem] border border-glass-border bg-surface-lowest/80 backdrop-blur-xl">
                {overview?.funds.map((row, index) => {
                  const color = resolveFundUiColor(row.fund, isDark);
                  return (
                    <li key={row.fund.id}>
                      <button
                        type="button"
                        onClick={() => openDetail(row)}
                        className={`group flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-glass-soft/60 active:bg-glass-soft ${
                          index > 0 ? "border-t border-outline-variant/12" : ""
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                          style={{ backgroundColor: color }}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-tight text-on-surface">
                          {row.displayName}
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-[12px] font-medium tabular-nums text-on-surface">
                            <FormattedCurrency value={row.stats.spentThisMonth} />
                          </span>
                          <span
                            className={`block text-[11px] font-light tabular-nums ${
                              row.balance < 0
                                ? "text-balance-negative"
                                : "text-on-surface-variant"
                            }`}
                          >
                            Queda <FormattedCurrency value={row.balance} />
                          </span>
                        </span>
                        <ChevronRight
                          size={14}
                          strokeWidth={1.6}
                          className="shrink-0 text-outline-variant/70"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </main>
      )}

      <Sheet
        open={showCompare}
        onClose={() => setShowCompare(false)}
        title="Comparativa"
        subtitle={overview?.monthLabel}
        headerLayout="title-row"
        closeOnBackdrop
      >
        {overview ? (
          <div className="space-y-5 pb-4">
            <div className="rounded-[1.35rem] border border-glass-border bg-glass-soft/80 p-4">
              <p className="text-[11px] font-light text-on-surface-variant">
                Este mes vs mes anterior
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-light text-on-surface-variant">Este mes</p>
                  <p className="mt-0.5 text-[1.35rem] font-light tabular-nums tracking-tight text-on-surface">
                    <FormattedCurrency value={overview.totalSpentThisMonth} />
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-light text-on-surface-variant">Mes anterior</p>
                  <p className="mt-0.5 text-[1.35rem] font-light tabular-nums tracking-tight text-on-surface">
                    <FormattedCurrency value={overview.totalSpentLastMonth} />
                  </p>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-2 text-[13px] font-light text-on-surface">
                <DeltaIcon
                  delta={overview.totalDelta}
                  prevEmpty={overview.prevMonthEmpty}
                />
                {deltaSpendCopy(
                  overview.totalDelta,
                  overview.prevMonthEmpty,
                  overview.totalSpentThisMonth,
                  formatCurrency,
                  overview.totalDeltaPct
                )}
              </p>
            </div>

            {overview.topUp.length > 0 || overview.topDown.length > 0 ? (
              <div>
                <p className="mb-2.5 text-[11px] font-light text-on-surface-variant">
                  Bolsillos que más cambian
                </p>
                <ul className="space-y-2">
                  {overview.topUp.map((row) => (
                    <li
                      key={`up-${row.fundId}`}
                      className="flex items-center gap-3 rounded-2xl bg-glass-soft/80 px-3.5 py-2.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-800/80 dark:text-amber-200/85">
                        <TrendingUp size={14} strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-on-surface">
                          {row.fundName}
                        </p>
                        <p className="text-[11px] font-light text-on-surface-variant">
                          Más que el mes pasado
                        </p>
                      </div>
                      <p className="shrink-0 text-[13px] font-medium tabular-nums text-on-surface">
                        +
                        <FormattedCurrency value={row.delta} />
                      </p>
                    </li>
                  ))}
                  {overview.topDown.map((row) => (
                    <li
                      key={`down-${row.fundId}`}
                      className="flex items-center gap-3 rounded-2xl bg-glass-soft/80 px-3.5 py-2.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-800/80 dark:text-emerald-200/85">
                        <TrendingDown size={14} strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-on-surface">
                          {row.fundName}
                        </p>
                        <p className="text-[11px] font-light text-on-surface-variant">
                          Menos que el mes pasado
                        </p>
                      </div>
                      <p className="shrink-0 text-[13px] font-medium tabular-nums text-emerald-900/80 dark:text-emerald-100/90">
                        −
                        <FormattedCurrency value={Math.abs(row.delta)} />
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-outline-variant/30 px-4 py-5 text-center text-[13px] font-light text-on-surface-variant">
                Aún no hay cambios claros vs el mes anterior.
              </p>
            )}
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(detail)}
        onClose={() => {
          setDetail(null);
          setShowDetailFilter(false);
        }}
        title={detail?.displayName ?? "Bolsillo"}
        headerLayout="title-row"
        closeOnBackdrop
      >
        {detail ? (
          <div className="space-y-4 pb-4">
            <div
              className="overflow-hidden rounded-[1.35rem] border border-glass-border px-4 py-3.5"
              style={{
                backgroundImage: tintedGlassGradient(detailColor, {
                  soft: true,
                  midAlpha: "16",
                  endAlpha: "24",
                }),
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-light text-on-surface-variant">Saldo</p>
                  <p
                    className={`mt-0.5 text-[1.75rem] font-light leading-none tracking-tight tabular-nums ${
                      detail.balance < 0
                        ? "text-balance-negative"
                        : "text-on-surface"
                    }`}
                  >
                    <FormattedCurrency value={detail.balance} />
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-light capitalize text-on-surface-variant">
                    {selectedHistory?.monthLabelShort ?? "Mes"}
                  </p>
                  <p className="mt-0.5 text-[1.15rem] font-medium tabular-nums tracking-tight text-on-surface">
                    <FormattedCurrency value={displaySpent} />
                  </p>
                  <p className="mt-1 text-[11px] font-light text-on-surface-variant">
                    {selectedMemberName ? `gastado por ${selectedMemberName}` : "gastado"}
                  </p>
                </div>
              </div>
              {detailStory && !detailPayerId ? (
                <p className="mt-3 text-[12px] font-light leading-snug text-on-surface/85">
                  {detailStory.headline}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => openDeposit(detail.fund.id)}
                  className="inline-flex items-center rounded-full bg-surface-low/90 px-2.5 py-1 text-[11px] font-medium text-on-surface backdrop-blur-sm transition-colors hover:bg-surface-container disabled:opacity-60"
                >
                  Aportar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFromFundId(detail.fund.id);
                    setShowTransfer(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-surface-low/70 px-2.5 py-1 text-[11px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                >
                  <ArrowLeftRight size={11} strokeWidth={1.9} />
                  Transferir
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-light capitalize text-on-surface-variant">
                {selectedHistory?.monthLabel ?? "Este mes"}
              </p>
              <button
                type="button"
                onClick={() => setShowDetailFilter(true)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                  filterActive
                    ? "border-primary/30 bg-primary/10 text-on-surface"
                    : "border-glass-border bg-glass-soft text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <SlidersHorizontal size={12} strokeWidth={1.9} />
                Filtro
              </button>
            </div>

            {showEvolution ? (
              <div className="flex items-end gap-1 rounded-[1.15rem] border border-glass-border bg-surface-lowest/50 px-2.5 pb-2 pt-2.5">
                {[...detailHistory].reverse().map((point) => {
                  const active = point.monthKey === detailMonthKey;
                  const barPx =
                    historyMaxSpent > 0.009
                      ? Math.max(4, Math.round((point.spent / historyMaxSpent) * 32))
                      : 4;
                  return (
                    <button
                      key={`spark-${point.monthKey}`}
                      type="button"
                      onClick={() => setDetailMonthKey(point.monthKey)}
                      className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                      aria-label={`${point.monthLabel}: ${formatCurrency(point.spent)}`}
                    >
                      <span
                        className={`w-full max-w-[1.1rem] rounded-t-md transition-colors ${
                          active ? "bg-primary/80" : "bg-on-surface/15"
                        }`}
                        style={{ height: barPx }}
                      />
                      <span
                        className={`text-[8px] capitalize ${
                          active ? "font-medium text-on-surface" : "text-on-surface-variant"
                        }`}
                      >
                        {point.monthLabelShort.slice(0, 3)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div>
              {overview?.isCouple && memberOptions.length > 0 ? (
                <div
                  className="mb-3 grid gap-1 rounded-2xl bg-glass-soft p-1"
                  style={{
                    gridTemplateColumns: `repeat(${memberOptions.length + 1}, minmax(0, 1fr))`,
                  }}
                  role="tablist"
                  aria-label="Quién gastó"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={detailPayerId == null}
                    onClick={() => setDetailPayerId(null)}
                    className={`rounded-xl px-2 py-2 text-center transition-colors ${
                      detailPayerId == null
                        ? "bg-surface-lowest text-on-surface shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span className="block text-[12px] font-medium">Todos</span>
                    <span className="mt-0.5 block text-[10px] font-light tabular-nums text-on-surface-variant">
                      <FormattedCurrency value={selectedHistory?.spent ?? 0} />
                    </span>
                  </button>
                  {memberOptions.map((member) => {
                    const active = detailPayerId === member.id;
                    const amount =
                      selectedHistory?.byPayer?.find((p) => p.profileId === member.id)
                        ?.amount ?? 0;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setDetailPayerId(member.id)}
                        className={`rounded-xl px-2 py-2 text-center transition-colors ${
                          active
                            ? "bg-surface-lowest text-on-surface shadow-sm"
                            : "text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        <span className="block truncate text-[12px] font-medium">
                          {member.name}
                        </span>
                        <span className="mt-0.5 block text-[10px] font-light tabular-nums text-on-surface-variant">
                          <FormattedCurrency value={amount} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <p className="mb-2 text-[11px] font-light text-on-surface-variant">
                Movimientos
              </p>
              {monthMovements.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-outline-variant/30 px-4 py-4 text-center text-[13px] font-light text-on-surface-variant">
                  {detailPayerId
                    ? "Sin gastos de esta persona en este mes."
                    : "Sin gastos en este mes."}
                </p>
              ) : (
                <ul className="divide-y divide-outline-variant/12 overflow-hidden rounded-[1.15rem] border border-glass-border bg-surface-lowest/70">
                  {monthMovements.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-on-surface">
                          {m.concept?.trim() || "Gasto"}
                        </p>
                        <p className="text-[11px] font-light text-on-surface-variant">
                          {formatShortDate(m.expense_date)}
                          {overview?.isCouple && !detailPayerId ? ` · ${m.payerName}` : ""}
                        </p>
                      </div>
                      <p className="shrink-0 text-[13px] font-medium tabular-nums text-on-surface">
                        <FormattedCurrency value={m.amount} />
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={showDetailFilter && Boolean(detail)}
        onClose={() => setShowDetailFilter(false)}
        title="Filtro"
        headerLayout="title-row"
        closeOnBackdrop
        zIndexClassName="z-[110]"
      >
        <div className="space-y-5 pb-4">
          <div>
            <p className="mb-2 text-[11px] font-light text-on-surface-variant">Mes</p>
            <div className="grid grid-cols-3 gap-1.5">
              {[...detailHistory].reverse().map((point) => {
                const active = point.monthKey === detailMonthKey;
                return (
                  <button
                    key={point.monthKey}
                    type="button"
                    onClick={() => setDetailMonthKey(point.monthKey)}
                    className={`rounded-xl px-2 py-2.5 text-center text-[12px] font-medium capitalize transition-colors ${
                      active
                        ? "bg-primary text-on-primary"
                        : "bg-glass-soft text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {point.monthLabelShort}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-light text-on-surface-variant">Mostrar</p>
            <button
              type="button"
              onClick={() => setShowEvolution((v) => !v)}
              className={`flex w-full items-center justify-between rounded-2xl border px-3.5 py-3 text-left transition-colors ${
                showEvolution
                  ? "border-primary/25 bg-primary/8"
                  : "border-glass-border bg-glass-soft"
              }`}
              aria-pressed={showEvolution}
            >
              <span>
                <span className="block text-[13px] font-medium text-on-surface">Evolución</span>
                <span className="mt-0.5 block text-[11px] font-light text-on-surface-variant">
                  Barras de los últimos 6 meses
                </span>
              </span>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  showEvolution ? "bg-primary" : "bg-outline-variant/40"
                }`}
                aria-hidden
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    showEvolution ? "left-5" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowDetailFilter(false)}
            className="fab-ink flex h-11 w-full items-center justify-center rounded-2xl text-sm font-semibold"
          >
            Listo
          </button>
        </div>
      </Sheet>

      <Sheet
        open={showTransfer}
        onClose={() => setShowTransfer(false)}
        title="Transferir entre bolsillos"
        headerLayout="title-row"
        closeOnBackdrop
      >
        <div className="space-y-4 pb-4">
          <p className="text-[13px] font-light leading-relaxed text-on-surface-variant">
            Mueve saldo de un bolsillo a otro. No es un gasto nuevo: es ordenar el dinero del mes.
          </p>
          <div>
            <label className="mb-1.5 block text-[11px] font-light text-on-surface-variant">
              Desde
            </label>
            <select
              value={fromFundId}
              onChange={(e) => setFromFundId(e.target.value)}
              className="w-full rounded-2xl border border-outline-variant/30 bg-surface-lowest px-3.5 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/15"
            >
              {(overview?.funds ?? []).map((f) => (
                <option key={f.fund.id} value={f.fund.id}>
                  {f.displayName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-light text-on-surface-variant">
              Hacia
            </label>
            <select
              value={toFundId}
              onChange={(e) => setToFundId(e.target.value)}
              className="w-full rounded-2xl border border-outline-variant/30 bg-surface-lowest px-3.5 py-3 text-[14px] outline-none focus:ring-2 focus:ring-primary/15"
            >
              {(overview?.funds ?? []).map((f) => (
                <option key={f.fund.id} value={f.fund.id}>
                  {f.displayName}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              setTransferAmount("0");
              setShowTransferKeypad(true);
            }}
            className="fab-ink flex h-11 w-full items-center justify-center rounded-2xl text-sm font-semibold"
          >
            Elegir importe
          </button>
        </div>
      </Sheet>

      <NumericKeypadSheet
        isOpen={showDepositKeypad}
        title="APORTAR AL BOLSILLO"
        initialValue={depositAmount}
        onClose={() => setShowDepositKeypad(false)}
        onValueChange={setDepositAmount}
        onConfirm={confirmDeposit}
      />

      <NumericKeypadSheet
        isOpen={showTransferKeypad}
        title="TRANSFERIR"
        initialValue={transferAmount}
        onClose={() => setShowTransferKeypad(false)}
        onValueChange={setTransferAmount}
        onConfirm={confirmTransfer}
      />
    </div>
  );
}
