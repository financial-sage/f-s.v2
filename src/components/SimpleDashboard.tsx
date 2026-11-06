"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  CreditCard,
  Landmark,
  PiggyBank,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { FormattedCurrency } from "@/components/FormattedCurrency";
import { UpcomingPaymentsCard } from "@/components/UpcomingPaymentsCard";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { Sheet } from "@/components/ui/Sheet";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/components/ui/cn";
import { useBudget } from "@/hooks/useBudget";
import {
  calculateAccountCashBalance,
  creditDebtFromBalance,
  listCreditAccountsForUser,
} from "@/lib/accounts";
import { BUDGET_CHANGE_EVENT, getMonthKey } from "@/lib/budget";
import {
  ENVELOPE_CHANGE_EVENT,
  filterBudgetGroupsForScope,
  readMonthEnvelopePlan,
  totalBudgeted,
  writeMonthEnvelopePlan,
} from "@/lib/budgetEnvelopes";
import { getUpcomingWeeklyPayments } from "@/lib/budgetHelpers";
import { sumSpendingForBudgetedIds } from "@/lib/budgetSpending";
import {
  calculateFundCashBalance,
  getSavingsFund,
  SAVINGS_FUND_COLOR,
} from "@/lib/funds";
import { sageGlassGradient } from "@/lib/glass";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useCategoriesStore } from "@/store/useCategoriesStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useFundsStore } from "@/store/useFundsStore";

/** Glass shell like SharedSpaceCard; radius matches UpcomingPaymentsCard. */
const PROFILE_GLASS_CARD =
  "overflow-hidden rounded-xl border border-glass-border bg-glass p-4 shadow-[0_12px_28px_rgba(43,52,55,0.08)] backdrop-blur-xl";

function progressTone(percent: number): "ok" | "warning" | "critical" {
  if (percent > 90) return "critical";
  if (percent > 75) return "warning";
  return "ok";
}

function progressBarClass(tone: "ok" | "warning" | "critical") {
  if (tone === "critical") {
    return "bg-[color-mix(in_srgb,var(--balance-negative)_88%,transparent)]";
  }
  if (tone === "warning") return "bg-amber-500/85";
  return "bg-primary";
}

export default function SimpleDashboard() {
  const router = useRouter();
  const userId = useExpenseStore((s) => s.userId);
  const familyId = useExpenseStore((s) => s.familyId);
  const expenses = useExpenseStore((s) => s.expenses);
  const isHydrated = useExpenseStore((s) => s.isHydrated);

  const accounts = useAccountsStore((s) => s.accounts);
  const loadAccounts = useAccountsStore((s) => s.load);
  const liquidAccountsFor = useAccountsStore((s) => s.liquidAccountsFor);
  const savingsAccountsFor = useAccountsStore((s) => s.savingsAccountsFor);

  const funds = useFundsStore((s) => s.funds);
  const loadFunds = useFundsStore((s) => s.load);

  const categories = useCategoriesStore((s) => s.categories);
  const loadCategories = useCategoriesStore((s) => s.load);

  const { getLimits, currentMonthKey } = useBudget(familyId ?? "");
  const [accountsSheetOpen, setAccountsSheetOpen] = useState(false);
  const [liquidityOpen, setLiquidityOpen] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectionReady, setSelectionReady] = useState(false);
  const [envelopeTick, setEnvelopeTick] = useState(0);

  const monthKey = currentMonthKey || getMonthKey();
  const limits = getLimits(monthKey);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setEnvelopeTick((n) => n + 1);
    window.addEventListener(ENVELOPE_CHANGE_EVENT, bump);
    window.addEventListener(BUDGET_CHANGE_EVENT, bump);
    return () => {
      window.removeEventListener(ENVELOPE_CHANGE_EVENT, bump);
      window.removeEventListener(BUDGET_CHANGE_EVENT, bump);
    };
  }, []);

  const liquidAccounts = useMemo(() => {
    if (!userId) return [];
    return liquidAccountsFor(userId);
  }, [userId, accounts, liquidAccountsFor]);

  const savingsAccounts = useMemo(() => {
    if (!userId) return [];
    return savingsAccountsFor(userId);
  }, [userId, accounts, savingsAccountsFor]);

  const savingsFund = useMemo(() => getSavingsFund(funds), [funds]);
  const savingsFundBalance = useMemo(() => {
    if (!savingsFund) return 0;
    return calculateFundCashBalance(expenses, savingsFund.id);
  }, [savingsFund, expenses]);

  const checkingAccountsTotal = useMemo(() => {
    const total = liquidAccounts.reduce(
      (sum, account) =>
        sum + calculateAccountCashBalance(expenses, account.id),
      0,
    );
    return Math.round(total * 100) / 100;
  }, [liquidAccounts, expenses]);

  const investmentsTotal = useMemo(() => {
    const total = savingsAccounts.reduce(
      (sum, account) =>
        sum + calculateAccountCashBalance(expenses, account.id),
      0,
    );
    return Math.round(total * 100) / 100;
  }, [savingsAccounts, expenses]);

  const creditAccounts = useMemo(() => {
    if (!userId) return [];
    return listCreditAccountsForUser(accounts, userId);
  }, [userId, accounts]);

  const creditsDebtTotal = useMemo(() => {
    const total = creditAccounts.reduce((sum, account) => {
      const raw = calculateAccountCashBalance(expenses, account.id);
      return sum + creditDebtFromBalance(raw);
    }, 0);
    return Math.round(total * 100) / 100;
  }, [creditAccounts, expenses]);

  const patrimonioHeaderTotal = useMemo(
    () =>
      Math.round(
        (checkingAccountsTotal + savingsFundBalance + investmentsTotal) * 100,
      ) / 100,
    [checkingAccountsTotal, savingsFundBalance, investmentsTotal],
  );

  useEffect(() => {
    if (!familyId) return;
    void loadAccounts();
    void loadCategories();
    void loadFunds();
  }, [familyId, loadAccounts, loadCategories, loadFunds]);

  useEffect(() => {
    if (!userId || !familyId) return;
    if (liquidAccounts.length === 0) {
      setSelectedAccountIds([]);
      setSelectionReady(true);
      return;
    }

    const saved = readMonthEnvelopePlan(familyId, monthKey);
    const valid = new Set(liquidAccounts.map((a) => a.id));
    const fromSaved = (saved?.accountIds ?? []).filter((id) => valid.has(id));
    setSelectedAccountIds(
      fromSaved.length > 0 ? fromSaved : liquidAccounts.map((a) => a.id),
    );
    setSelectionReady(true);
  }, [userId, familyId, monthKey, liquidAccounts]);

  function persistAccountSelection(nextIds: string[]) {
    if (!familyId) return;
    const existing = readMonthEnvelopePlan(familyId, monthKey);
    writeMonthEnvelopePlan(familyId, monthKey, {
      accountIds: nextIds,
      groups: existing?.groups ?? [],
    });
  }

  function toggleAccount(accountId: string) {
    setSelectedAccountIds((prev) => {
      const next = prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId];
      persistAccountSelection(next);
      return next;
    });
  }

  const availableToday = useMemo(() => {
    if (!userId || !selectionReady) return 0;
    const selected = new Set(selectedAccountIds);
    const total = liquidAccounts
      .filter((a) => selected.has(a.id))
      .reduce(
        (sum, account) =>
          sum + calculateAccountCashBalance(expenses, account.id),
        0,
      );
    return Math.round(total * 100) / 100;
  }, [
    userId,
    selectionReady,
    selectedAccountIds,
    liquidAccounts,
    expenses,
  ]);

  const budgetSummary = useMemo(() => {
    const envelope =
      familyId != null ? readMonthEnvelopePlan(familyId, monthKey) : null;

    const budgetedIds = new Set<string>();
    const budgetedNames = new Set<string>();
    let totalPresupuestado = 0;

    const visibleGroups = envelope?.groups?.length
      ? [
          ...filterBudgetGroupsForScope(envelope.groups, "shared", userId),
          ...filterBudgetGroupsForScope(envelope.groups, "personal", userId),
        ]
      : [];

    if (visibleGroups.length > 0) {
      totalPresupuestado = totalBudgeted(visibleGroups);
      for (const group of visibleGroups) {
        if (group.segments.length > 0) {
          for (const seg of group.segments) {
            if ((Number(seg.amount) || 0) > 0) {
              budgetedIds.add(seg.id);
              if (seg.name.trim()) budgetedNames.add(seg.name.trim());
            }
          }
        } else if ((Number(group.amount) || 0) > 0) {
          budgetedIds.add(group.id);
          if (group.name.trim()) budgetedNames.add(group.name.trim());
        }
      }
    } else {
      for (const [id, raw] of Object.entries(limits)) {
        const amount = Math.round((Number(raw) || 0) * 100) / 100;
        if (amount <= 0) continue;
        totalPresupuestado += amount;
        budgetedIds.add(id);
      }
      totalPresupuestado = Math.round(totalPresupuestado * 100) / 100;
    }

    const totalGastado = sumSpendingForBudgetedIds(
      expenses,
      monthKey,
      categories,
      budgetedIds,
      budgetedNames,
    );

    const rawPercent =
      totalPresupuestado > 0
        ? Math.round((totalGastado / totalPresupuestado) * 1000) / 10
        : 0;

    return {
      totalPresupuestado,
      totalGastado,
      porcentajeGlobal: Math.min(100, rawPercent),
      tone: progressTone(rawPercent),
      // Groups count even with 0 assigned (migration / empty shells).
      hasBudget:
        visibleGroups.length > 0 ||
        totalPresupuestado > 0 ||
        Object.keys(limits).some((id) => Number(limits[id]) > 0),
    };
  }, [
    categories,
    expenses,
    familyId,
    limits,
    monthKey,
    envelopeTick,
    userId,
  ]);

  const upcomingPayments = useMemo(() => {
    if (!familyId) return [];
    const envelope = readMonthEnvelopePlan(familyId, monthKey);
    if (!envelope?.groups?.length) return [];
    const visible = [
      ...filterBudgetGroupsForScope(envelope.groups, "shared", userId),
      ...filterBudgetGroupsForScope(envelope.groups, "personal", userId),
    ];
    return getUpcomingWeeklyPayments(visible, expenses, { monthKey });
  }, [familyId, monthKey, expenses, userId, envelopeTick]);

  return (
    <div className="relative min-h-0 flex-1 bg-page-gradient text-on-surface">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-page-glow"
        aria-hidden
      />

      <div className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden overscroll-y-contain [-webkit-overflow-scrolling:touch]">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pb-28 pt-5">
          <header className="px-1">
            <p className="text-[11px] font-light text-on-surface-variant">
              Inicio
            </p>
            <h1 className="text-[17px] font-medium tracking-tight text-on-surface">
              Vista simplificada
            </h1>
          </header>

          <section
            className="overflow-hidden rounded-[1.85rem] px-5 pb-3.5 pt-5 shadow-[0_14px_40px_rgba(43,52,55,0.12)] backdrop-blur-2xl"
            style={{ backgroundImage: sageGlassGradient() }}
          >
            <p className="text-[11px] font-light text-on-surface-variant">
              Disponible hoy
            </p>
            <p
              className={`mt-2.5 text-[2.35rem] font-light leading-none tracking-tight tabular-nums ${
                availableToday < 0
                  ? "text-balance-negative"
                  : "text-on-surface"
              }`}
            >
              {isHydrated || accounts.length > 0 ? (
                <FormattedCurrency value={availableToday} />
              ) : (
                "—"
              )}
            </p>

            <div className="mt-3.5 flex items-stretch border-t border-outline-variant/15 pt-2.5">
              <button
                type="button"
                onClick={() => setLiquidityOpen((v) => !v)}
                aria-expanded={liquidityOpen}
                className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left transition-colors hover:text-on-surface"
              >
                <span className="truncate text-[12px] font-medium text-on-surface-variant">
                  {selectedAccountIds.length} en liquidez
                </span>
                <ChevronDown
                  size={14}
                  strokeWidth={1.75}
                  className={cn(
                    "shrink-0 text-on-surface-variant/70 transition-transform duration-200",
                    liquidityOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              <span
                className="mx-2 w-px shrink-0 self-stretch bg-outline-variant/20"
                aria-hidden
              />
              <button
                type="button"
                onClick={() => {
                  setLiquidityOpen(false);
                  setAccountsSheetOpen(true);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 py-1 text-[12px] font-medium text-on-surface-variant transition-colors hover:text-on-surface"
              >
                <Landmark size={13} strokeWidth={1.75} aria-hidden />
                Administrar
              </button>
            </div>
          </section>

          {liquidityOpen ? (
            <ul className="animate-in fade-in slide-in-from-top-1 duration-200 -mt-2 space-y-0 rounded-xl border border-outline-variant/15 bg-on-surface/[0.02] px-2 py-1">
              {liquidAccounts.length === 0 ? (
                <li className="px-1.5 py-2.5 text-[11px] font-light text-on-surface-variant">
                  Aún no hay cuentas de liquidez.
                </li>
              ) : (
                liquidAccounts.map((account) => {
                  const active = selectedAccountIds.includes(account.id);
                  const balance = calculateAccountCashBalance(
                    expenses,
                    account.id,
                  );
                  return (
                    <li key={account.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleAccount(account.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleAccount(account.id);
                          }
                        }}
                        className={cn(
                          "flex w-full cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-on-surface/[0.03]",
                          !active && "opacity-50",
                        )}
                      >
                        <span className="min-w-0 flex-1 truncate text-[12px] font-light text-on-surface">
                          {account.name}
                        </span>
                        <span className="shrink-0 text-[11px] font-light tabular-nums text-on-surface-variant">
                          <FormattedCurrency value={balance} />
                        </span>
                        <Switch
                          checked={active}
                          size="sm"
                          onCheckedChange={() => toggleAccount(account.id)}
                          aria-label={
                            active
                              ? `Excluir ${account.name} del disponible`
                              : `Incluir ${account.name} en el disponible`
                          }
                        />
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          ) : null}

          <UpcomingPaymentsCard payments={upcomingPayments} />

          <section>
            {!budgetSummary.hasBudget ? (
              <div className={PROFILE_GLASS_CARD}>
                <div className="flex items-center gap-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium tracking-tight text-on-surface">
                      Sin presupuesto
                    </p>
                    <p className="text-[11px] font-light text-on-surface-variant">
                      Reparte tu liquidez en presupuestos
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => router.push("/budget")}
                    className="fab-ink h-8 shrink-0 rounded-xl px-3 text-[12px] font-semibold shadow-none"
                  >
                    Configurar
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/budget")}
                className={`${PROFILE_GLASS_CARD} group w-full text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-[0.99]`}
                aria-label="Ver y ajustar presupuesto del mes"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-light text-on-surface-variant">
                    Presupuesto del mes
                  </p>
                  <ChevronRight
                    size={14}
                    strokeWidth={1.75}
                    className="shrink-0 text-on-surface-variant/70 transition-colors group-hover:text-on-surface"
                    aria-hidden
                  />
                </div>

                <p className="mt-1.5 text-[15px] font-medium tracking-tight tabular-nums text-on-surface">
                  <FormattedCurrency value={budgetSummary.totalGastado} />
                  <span className="ml-1 text-[11px] font-light text-on-surface-variant">
                    de{" "}
                    <FormattedCurrency
                      value={budgetSummary.totalPresupuestado}
                    />
                  </span>
                </p>

                <Progress
                  value={budgetSummary.porcentajeGlobal}
                  className="mt-2.5 h-1.5 bg-on-surface/[0.07]"
                  indicatorClassName={progressBarClass(budgetSummary.tone)}
                />
                <p className="mt-1.5 text-[10px] font-light tabular-nums text-on-surface-variant">
                  {budgetSummary.porcentajeGlobal.toLocaleString("es-ES", {
                    maximumFractionDigits: 0,
                  })}
                  % · Quedan{" "}
                  <FormattedCurrency
                    value={Math.max(
                      0,
                      Math.round(
                        (budgetSummary.totalPresupuestado -
                          budgetSummary.totalGastado) *
                          100,
                      ) / 100,
                    )}
                  />
                </p>
              </button>
            )}
          </section>
        </div>
      </div>

      <Sheet
        open={accountsSheetOpen}
        onClose={() => setAccountsSheetOpen(false)}
        title="Cuentas"
        subtitle="Colchón y depósitos apartados"
        headerLayout="title-row"
        closeOnBackdrop
        heightClassName="h-auto max-h-[85dvh]"
      >
        <div className="pb-4">
          <div className="mb-3.5">
            <p className="text-[11px] font-light text-on-surface-variant">
              Apartado en ahorros
            </p>
            <p className="mt-1 text-[1.85rem] font-light leading-none tracking-tight tabular-nums text-on-surface">
              <FormattedCurrency value={patrimonioHeaderTotal} />
            </p>
          </div>

          <ul className="space-y-2">
            {(
              [
                {
                  id: "cuentas",
                  label: "Cuentas",
                  hint: "Liquidez operativa",
                  value: checkingAccountsTotal,
                  negative: false,
                  icon: Wallet,
                  iconClass: "bg-on-surface/[0.04] text-on-surface-variant",
                  href: "/accounts?tab=checking",
                },
                {
                  id: "ahorro",
                  label: "Ahorro",
                  hint: "Colchón apartado",
                  value: savingsFundBalance,
                  negative: false,
                  icon: PiggyBank,
                  iconClass: "",
                  iconStyle: {
                    backgroundColor: `${SAVINGS_FUND_COLOR}18`,
                    color: SAVINGS_FUND_COLOR,
                  } as CSSProperties,
                  href: "/savings",
                },
                {
                  id: "inversiones",
                  label: "Inversiones",
                  hint: "Depósitos y valorados",
                  value: investmentsTotal,
                  negative: false,
                  icon: TrendingUp,
                  iconClass: "bg-on-surface/[0.04] text-on-surface-variant",
                  href: "/accounts?tab=investment",
                },
                {
                  id: "creditos",
                  label: "Créditos",
                  hint: creditsDebtTotal > 0 ? "Debes" : "Sin deuda",
                  value: creditsDebtTotal,
                  negative: creditsDebtTotal > 0,
                  icon: CreditCard,
                  iconClass: "bg-on-surface/[0.04] text-on-surface-variant",
                  href: "/accounts?tab=credit",
                },
              ] as const
            ).map((row) => {
              const Icon = row.icon;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountsSheetOpen(false);
                      router.push(row.href);
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-outline-variant/15 bg-on-surface/[0.015] px-3.5 py-3 text-left transition-colors hover:bg-on-surface/[0.03] active:scale-[0.99]"
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        row.iconClass,
                      )}
                      style={"iconStyle" in row ? row.iconStyle : undefined}
                      aria-hidden
                    >
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium tracking-tight text-on-surface">
                        {row.label}
                      </p>
                      <p className="mt-0.5 text-[11px] font-light text-on-surface-variant">
                        {row.hint}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-[15px] font-light tabular-nums",
                        row.negative
                          ? "text-balance-negative"
                          : "text-on-surface",
                      )}
                    >
                      <FormattedCurrency value={row.value} />
                    </span>
                    <ChevronRight
                      size={14}
                      strokeWidth={1.75}
                      className="shrink-0 text-on-surface-variant/50"
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Sheet>

    </div>
  );
}
