"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  PiggyBank,
  Plus,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  contributeToSavingsAction,
  getSavingsOverviewAction,
  type SavingsOverview,
  type SavingsSource,
} from "@/app/actions/savings";
import { NumericKeypadSheet } from "@/components/NumericKeypadSheet";
import { Sheet } from "@/components/ui/Sheet";
import { useCurrency } from "@/hooks/useCurrency";
import { formatMonthLabel } from "@/lib/budget";
import { resolveAccountColor } from "@/lib/accounts";
import { resolveFundColor, SAVINGS_FUND_COLOR } from "@/lib/funds";
import { tintedGlassGradient } from "@/lib/glass";
import { isIndividualHousehold } from "@/lib/household";

const ACCENT = SAVINGS_FUND_COLOR;

type SourceTab = "account" | "fund" | "external";

interface SavingsPanelProps {
  familyMemberCount?: number;
}

export default function SavingsPanel({ familyMemberCount = 1 }: SavingsPanelProps) {
  const isIndividual = isIndividualHousehold(familyMemberCount);
  const { format: formatCurrency } = useCurrency();
  const [overview, setOverview] = useState<SavingsOverview | null>(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [contributeOpen, setContributeOpen] = useState(false);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [amount, setAmount] = useState("0");
  const [source, setSource] = useState<SavingsSource | null>(null);
  const [sourceTab, setSourceTab] = useState<SourceTab>("account");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const data = await getSavingsOverviewAction();
      setOverview(data);
      setSource((prev) => {
        if (prev) return prev;
        if (data.operableAccounts[0]) {
          return { type: "account", id: data.operableAccounts[0].id };
        }
        if (data.operableFunds[0]) {
          return { type: "fund", id: data.operableFunds[0].id };
        }
        return { type: "external" };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el ahorro.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const metrics = overview?.metrics;
  const deltaCopy = useMemo(() => {
    if (!metrics) return null;
    if (metrics.prevMonthEmpty) {
      return metrics.thisMonth > 0
        ? "Primer mes con aporte registrado"
        : "Sin aportes este mes ni el anterior";
    }
    if (Math.abs(metrics.delta) < 0.01) {
      return "Igual que el mes pasado";
    }
    const abs = formatCurrency(Math.abs(metrics.delta));
    const pct =
      metrics.percentChange != null ? ` (${Math.abs(metrics.percentChange)}%)` : "";
    return metrics.delta > 0
      ? `+${abs} que el mes pasado${pct}`
      : `−${abs} que el mes pasado${pct}`;
  }, [metrics, formatCurrency]);

  function openContribute() {
    setWarning("");
    setError("");
    setAmount("0");
    const hasAccounts = Boolean(overview?.operableAccounts.length);
    const hasFunds = Boolean(overview?.operableFunds.length);
    const nextTab: SourceTab =
      source?.type === "external"
        ? "external"
        : source?.type === "fund" && hasFunds
          ? "fund"
          : source?.type === "account" && hasAccounts
            ? "account"
            : hasAccounts
              ? "account"
              : hasFunds
                ? "fund"
                : "external";
    setSourceTab(nextTab);
    if (nextTab === "external") setSource({ type: "external" });
    setContributeOpen(true);
  }

  function selectSourceTab(tab: SourceTab) {
    setSourceTab(tab);
    if (tab === "external") {
      setSource({ type: "external" });
      return;
    }
    if (tab === "account") {
      if (source?.type === "account") return;
      const first = overview?.operableAccounts[0];
      setSource(first ? { type: "account", id: first.id } : null);
      return;
    }
    if (source?.type === "fund") return;
    const first = overview?.operableFunds[0];
    setSource(first ? { type: "fund", id: first.id } : null);
  }

  function confirmContribute() {
    if (!source) {
      setError("Elige un origen o usa Directo.");
      return;
    }
    const value = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Ingresa un importe válido.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await contributeToSavingsAction({
          amount: value,
          source,
        });
        if ("balanceWarning" in result && result.balanceWarning) {
          setWarning("La cuenta de origen puede quedar en negativo.");
        }
        setContributeOpen(false);
        setKeypadOpen(false);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo aportar.");
      }
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-page-gradient text-sm text-on-surface-variant">
        Cargando ahorros…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-page-gradient">
      <header className="mx-auto flex w-full max-w-md items-center px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-on-surface-variant">
            {isIndividual ? "Mi colchón" : "Familia"}
          </p>
          <h1 className="truncate text-lg font-semibold tracking-tight text-on-surface">
            {isIndividual ? "Mi ahorro" : "Ahorros"}
          </h1>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-[var(--fab-clearance)] pt-1">
        {error ? (
          <p className="alert-error rounded-2xl px-4 py-3 text-sm">{error}</p>
        ) : null}
        {warning ? (
          <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            {warning}
          </p>
        ) : null}

        <section
          className="relative overflow-hidden rounded-[1.85rem] border-[0.5px] border-glass-border p-6 shadow-[var(--glass-shadow)] backdrop-blur-2xl"
          style={{ backgroundImage: tintedGlassGradient(ACCENT) }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-light text-on-surface-variant">
                Saldo acumulado
              </p>
              <p className="mt-2 text-[2.4rem] font-light leading-none tracking-tight text-on-surface">
                {formatCurrency(overview?.balance ?? 0)}
              </p>
            </div>
            <div
              className="icon-chip-fund icon-chip-coin flex h-12 w-12 items-center justify-center rounded-2xl border"
              style={{ ["--icon-chip-accent" as string]: ACCENT }}
            >
              <PiggyBank size={20} strokeWidth={2.2} />
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border-[0.5px] border-outline-variant/25 bg-glass-soft p-4 backdrop-blur-xl">
          <p className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">
            Este mes
            {metrics ? ` · ${formatMonthLabel(metrics.monthKey)}` : ""}
          </p>
          <p className="mt-2 text-2xl font-medium tracking-tight text-on-surface">
            {formatCurrency(metrics?.thisMonth ?? 0)}
          </p>
          <div className="mt-3 flex items-center gap-2">
            {metrics && !metrics.prevMonthEmpty && metrics.delta > 0.009 ? (
              <TrendingUp size={16} className="text-emerald-600" />
            ) : metrics && !metrics.prevMonthEmpty && metrics.delta < -0.009 ? (
              <TrendingDown size={16} className="text-rose-600" />
            ) : (
              <PiggyBank size={16} className="text-on-surface-variant" />
            )}
            <p className="text-sm text-on-surface-variant">{deltaCopy}</p>
          </div>
          {metrics && !metrics.prevMonthEmpty ? (
            <p className="mt-1 text-[11px] text-outline-variant">
              Mes anterior: {formatCurrency(metrics.prevMonth)}
            </p>
          ) : null}
        </section>

        <button
          type="button"
          onClick={openContribute}
          className="fab-ink flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-transform active:scale-[0.98]"
        >
          <Plus size={18} strokeWidth={2.4} />
          Aportar al ahorro
        </button>

        <section>
          <h2 className="mb-2 px-1 text-xs font-medium text-on-surface">
            Movimientos recientes
          </h2>
          {!overview?.recentMovements.length ? (
            <p className="rounded-2xl border border-dashed border-outline-variant/30 px-4 py-6 text-center text-sm text-on-surface-variant">
              Aún no hay aportes. Cuando organicéis el mes, apartad aquí el ahorro.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {overview.recentMovements.map((movement) => (
                <li
                  key={movement.id}
                  className="flex items-center gap-3 rounded-2xl border border-glass-border bg-surface-lowest/70 px-3 py-2.5"
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      movement.direction === "in"
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-rose-500/15 text-rose-700"
                    }`}
                  >
                    {movement.direction === "in" ? (
                      <ArrowDownLeft size={16} />
                    ) : (
                      <ArrowUpRight size={16} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-on-surface">
                      {movement.concept || (movement.direction === "in" ? "Aporte" : "Retiro")}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      {movement.expense_date
                        ? new Intl.DateTimeFormat("es-ES", {
                            day: "numeric",
                            month: "short",
                          }).format(new Date(`${movement.expense_date}T12:00:00`))
                        : "—"}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      movement.direction === "in" ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {movement.direction === "in" ? "+" : "−"}
                    {formatCurrency(movement.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <Sheet
        open={contributeOpen}
        onClose={() => setContributeOpen(false)}
        title="Aportar al ahorro"
        closeOnBackdrop
      >
        <div className="space-y-4 px-1 pb-2">
          <p className="text-sm text-on-surface-variant">
            Elige origen o registra el aporte sin trazabilidad.
          </p>

          <div className="space-y-3">
            <div
              className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-low p-1"
              role="tablist"
              aria-label="Tipo de origen"
            >
              <button
                type="button"
                role="tab"
                aria-selected={sourceTab === "account"}
                disabled={!overview?.operableAccounts.length}
                onClick={() => selectSourceTab("account")}
                className={`rounded-xl px-2 py-2 text-[13px] font-medium transition-colors disabled:opacity-40 ${
                  sourceTab === "account"
                    ? "bg-surface-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant"
                }`}
              >
                Cuenta
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sourceTab === "fund"}
                disabled={!overview?.operableFunds.length}
                onClick={() => selectSourceTab("fund")}
                className={`rounded-xl px-2 py-2 text-[13px] font-medium transition-colors disabled:opacity-40 ${
                  sourceTab === "fund"
                    ? "bg-surface-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant"
                }`}
              >
                Bolsillo
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={sourceTab === "external"}
                onClick={() => selectSourceTab("external")}
                className={`rounded-xl px-2 py-2 text-[13px] font-medium transition-colors ${
                  sourceTab === "external"
                    ? "bg-surface-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant"
                }`}
              >
                Directo
              </button>
            </div>

            {sourceTab === "account" ? (
              overview?.operableAccounts.length ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {overview.operableAccounts.map((account) => {
                    const selected =
                      source?.type === "account" && source.id === account.id;
                    const color = resolveAccountColor(account);
                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() =>
                          setSource({ type: "account", id: account.id })
                        }
                        className={`flex flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-center transition-colors ${
                          selected
                            ? "border-primary/35 bg-primary/10"
                            : "border-glass-border bg-surface-low"
                        }`}
                      >
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${color}22`, color }}
                        >
                          <Landmark size={12} />
                        </span>
                        <span className="w-full truncate text-[11px] font-medium tracking-tight text-on-surface">
                          {account.name}
                        </span>
                        <span
                          className={`w-full truncate text-[10px] font-medium tabular-nums ${
                            account.balance < 0
                              ? "text-red-600"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {formatCurrency(account.balance)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-outline-variant/30 px-3 py-4 text-center text-xs text-on-surface-variant">
                  No hay cuentas. Usa Directo para registrar el aporte.
                </p>
              )
            ) : sourceTab === "fund" ? (
              overview?.operableFunds.length ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {overview.operableFunds.map((fund) => {
                    const selected =
                      source?.type === "fund" && source.id === fund.id;
                    const color = resolveFundColor(fund);
                    return (
                      <button
                        key={fund.id}
                        type="button"
                        onClick={() => setSource({ type: "fund", id: fund.id })}
                        className={`flex flex-col items-center gap-1 rounded-xl border px-1.5 py-2 text-center transition-colors ${
                          selected
                            ? "border-primary/35 bg-primary/10"
                            : "border-glass-border bg-surface-low"
                        }`}
                      >
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${color}22`, color }}
                        >
                          <Wallet size={12} />
                        </span>
                        <span className="w-full truncate text-[11px] font-medium tracking-tight text-on-surface">
                          {fund.scope === "personal" && fund.is_default
                            ? "Mi bolsillo"
                            : fund.name}
                        </span>
                        <span
                          className={`w-full truncate text-[10px] font-medium tabular-nums ${
                            fund.balance < 0
                              ? "text-red-600"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {formatCurrency(fund.balance)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-outline-variant/30 px-3 py-4 text-center text-xs text-on-surface-variant">
                  No hay bolsillos. Usa Directo para registrar el aporte.
                </p>
              )
            ) : (
              <p className="rounded-xl border border-dashed border-outline-variant/25 bg-surface-low/60 px-3 py-3 text-center text-xs leading-relaxed text-on-surface-variant">
                Suma al ahorro sin mover cuentas ni bolsillos. Ideal si el
                dinero ya estaba apartado fuera de la app.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setKeypadOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl border border-glass-border bg-surface-low px-4 py-3"
          >
            <span className="text-sm text-on-surface-variant">Importe</span>
            <span className="text-lg font-semibold text-on-surface">
              {formatCurrency(Number(String(amount).replace(",", ".")) || 0)}
            </span>
          </button>

          <button
            type="button"
            disabled={isPending || !source}
            onClick={confirmContribute}
            className="fab-ink flex w-full items-center justify-center rounded-2xl py-3 text-sm font-semibold disabled:opacity-60"
          >
            {isPending ? "Guardando…" : "Confirmar aporte"}
          </button>
        </div>
      </Sheet>

      <NumericKeypadSheet
        isOpen={keypadOpen}
        title="Importe a ahorrar"
        subtitle="Ahorro"
        accentColor={ACCENT}
        initialValue={amount || "0"}
        onClose={() => setKeypadOpen(false)}
        onValueChange={setAmount}
        onConfirm={(value) => {
          setAmount(value ?? amount);
          setKeypadOpen(false);
        }}
      />
    </div>
  );
}
