"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  ChevronRight,
  CreditCard,
  Landmark,
  PiggyBank,
  Tags,
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
import { settleAccountReimbursementAction } from "@/app/actions/accounts";
import { useBudget } from "@/hooks/useBudget";
import { toast } from "@/hooks/useToast";
import {
  calculateAccountCashBalance,
  creditDebtFromBalance,
  listCreditAccountsForUser,
} from "@/lib/accounts";
import {
  computePendingAccountReimbursements,
  nameAccountReimbursements,
} from "@/lib/accountReimbursements";
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
import {
  cssDelicateGlassCardStyle,
  cssDelicateTopGlow,
  cssDelicateTopHairline,
} from "@/lib/glass";
import { useAccountsStore } from "@/store/useAccountsStore";
import { useCategoriesStore } from "@/store/useCategoriesStore";
import { useExpenseStore } from "@/store/useExpenseStore";
import { useFundsStore } from "@/store/useFundsStore";

/** Liquidez — near-flat fill + luminous accent rim. */
const HERO_CARD_STYLE = cssDelicateGlassCardStyle("var(--accent)");

/** Presupuesto — near-flat fill + luminous primary rim. */
const BUDGET_CARD_STYLE = cssDelicateGlassCardStyle("var(--primary)");

function DelicateCardChrome({
  color,
  className,
  style,
  children,
}: {
  color: string;
  className?: string;
  style: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={className} style={style}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-28"
        style={{ backgroundImage: cssDelicateTopGlow(color) }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-5 top-0 z-[2] h-px"
        style={{
          backgroundImage: cssDelicateTopHairline(color),
          boxShadow: `0 0 8px color-mix(in srgb, ${color} 16%, transparent)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

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
  const refreshData = useExpenseStore((s) => s.refreshData);
  const [accountsSheetOpen, setAccountsSheetOpen] = useState(false);
  const [accountsSheetTab, setAccountsSheetTab] = useState<
    "operativas" | "ahorros"
  >("operativas");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectionReady, setSelectionReady] = useState(false);
  const [envelopeTick, setEnvelopeTick] = useState(0);
  const [settlingKey, setSettlingKey] = useState<string | null>(null);

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

  const pendingReimbursements = useMemo(() => {
    const raw = computePendingAccountReimbursements(expenses);
    return nameAccountReimbursements(raw, liquidAccounts);
  }, [expenses, liquidAccounts]);

  async function handleSettleReimbursement(row: {
    debtorAccountId: string;
    creditorAccountId: string;
    debtorAccountName: string;
    creditorAccountName: string;
    amount: number;
  }) {
    const key = `${row.debtorAccountId}→${row.creditorAccountId}`;
    setSettlingKey(key);
    try {
      await settleAccountReimbursementAction({
        debtorAccountId: row.debtorAccountId,
        creditorAccountId: row.creditorAccountId,
        amount: row.amount,
      });
      await refreshData();
      toast({
        title: "Reembolso cuadrado",
        description: `${row.debtorAccountName} → ${row.creditorAccountName}`,
      });
    } catch (err) {
      toast({
        title: "No se pudo saldar",
        description:
          err instanceof Error ? err.message : "Inténtalo de nuevo.",
      });
    } finally {
      setSettlingKey(null);
    }
  }

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

          <DelicateCardChrome
            color="var(--accent)"
            className="relative overflow-hidden rounded-[1.75rem] px-5 py-5"
            style={HERO_CARD_STYLE}
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
            <p className="mt-1.5 text-[11px] font-light text-on-surface-variant">
              {selectedAccountIds.length} cuenta
              {selectedAccountIds.length === 1 ? "" : "s"} en la liquidez
            </p>
            <button
              type="button"
              onClick={() => {
                setAccountsSheetTab("operativas");
                setAccountsSheetOpen(true);
              }}
              className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-medium text-on-surface-variant transition-colors hover:text-on-surface"
            >
              <Landmark size={13} strokeWidth={1.75} aria-hidden />
              Gestionar cuentas
            </button>
          </DelicateCardChrome>

          <UpcomingPaymentsCard payments={upcomingPayments} />

          <section>
            {!budgetSummary.hasBudget ? (
              <DelicateCardChrome
                color="var(--primary)"
                className="relative overflow-hidden rounded-[1.35rem] px-3.5 py-3"
                style={BUDGET_CARD_STYLE}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-primary">
                    <Tags size={13} strokeWidth={1.6} aria-hidden />
                  </span>
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
              </DelicateCardChrome>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/budget")}
                className="group w-full rounded-[1.35rem] text-left transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 active:scale-[0.985]"
                aria-label="Ver y ajustar presupuesto del mes"
              >
                <DelicateCardChrome
                  color="var(--primary)"
                  className="relative overflow-hidden rounded-[1.35rem] px-3.5 py-3 transition-[box-shadow] duration-200 group-hover:shadow-[0_12px_26px_rgba(43,52,55,0.08)]"
                  style={BUDGET_CARD_STYLE}
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
                </DelicateCardChrome>
              </button>
            )}
          </section>
        </div>
      </div>

      <Sheet
        open={accountsSheetOpen}
        onClose={() => setAccountsSheetOpen(false)}
        title="Cuentas"
        subtitle={
          accountsSheetTab === "operativas"
            ? "Qué entra en Disponible hoy"
            : "Colchón y depósitos apartados"
        }
        headerLayout="title-row"
        closeOnBackdrop
        heightClassName="h-auto max-h-[85dvh]"
      >
        <div className="pb-4">
          <div className="mb-3.5">
            <p className="text-[11px] font-light text-on-surface-variant">
              {accountsSheetTab === "operativas"
                ? "Disponible hoy"
                : "Apartado en ahorros"}
            </p>
            <p className="mt-1 text-[1.85rem] font-light leading-none tracking-tight tabular-nums text-on-surface">
              <FormattedCurrency
                value={
                  accountsSheetTab === "operativas"
                    ? availableToday
                    : patrimonioHeaderTotal
                }
              />
            </p>
          </div>

          <div className="mb-3.5 flex rounded-full border border-outline-variant/20 bg-glass-soft p-0.5">
            {(
              [
                {
                  id: "operativas" as const,
                  label: "Operativas",
                  icon: Wallet,
                },
                {
                  id: "ahorros" as const,
                  label: "Ahorros y metas",
                  icon: PiggyBank,
                },
              ] as const
            ).map((tab) => {
              const active = accountsSheetTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAccountsSheetTab(tab.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] transition-colors",
                    active
                      ? "bg-glass-strong font-medium text-on-surface shadow-sm"
                      : "font-light text-on-surface-variant",
                  )}
                >
                  <Icon size={13} strokeWidth={1.7} aria-hidden />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {accountsSheetTab === "operativas" ? (
            <>
              {pendingReimbursements.length > 0 ? (
                <section className="mb-4 rounded-2xl border border-outline-variant/20 bg-on-surface/[0.02] px-3.5 py-3">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight
                      size={13}
                      strokeWidth={1.75}
                      className="shrink-0 text-on-surface-variant"
                      aria-hidden
                    />
                    <p className="text-[12px] font-medium tracking-tight text-on-surface">
                      Reembolsos pendientes entre cuentas
                    </p>
                  </div>
                  <ul className="mt-2.5 space-y-2.5">
                    {pendingReimbursements.map((row) => {
                      const key = `${row.debtorAccountId}→${row.creditorAccountId}`;
                      const busy = settlingKey === key;
                      return (
                        <li
                          key={key}
                          className="flex items-center gap-3 border-t border-outline-variant/10 pt-2.5 first:border-t-0 first:pt-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-medium tabular-nums text-on-surface">
                              <FormattedCurrency value={row.amount} />
                            </p>
                            <p className="mt-0.5 text-[11px] font-light text-on-surface-variant">
                              {row.debtorAccountName} le debe a{" "}
                              {row.creditorAccountName}
                            </p>
                          </div>
                          <Button
                            type="button"
                            disabled={busy}
                            onClick={() => void handleSettleReimbursement(row)}
                            className="fab-ink h-8 shrink-0 rounded-xl px-3 text-[11px] font-semibold shadow-none"
                          >
                            {busy ? "…" : "Saldar / Cuadrar"}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {liquidAccounts.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-outline-variant/25 px-4 py-8 text-center text-[13px] font-light text-on-surface-variant">
                  Aún no hay cuentas de liquidez.
                </p>
              ) : (
                <ul className="space-y-2">
                  {liquidAccounts.map((account) => {
                    const active = selectedAccountIds.includes(account.id);
                    const balance = calculateAccountCashBalance(
                      expenses,
                      account.id,
                    );
                    return (
                      <li key={account.id}>
                        <button
                          type="button"
                          onClick={() => toggleAccount(account.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all active:scale-[0.99]",
                            active
                              ? "border-primary/45 bg-primary/[0.06]"
                              : "border-outline-variant/15 bg-on-surface/[0.015] opacity-60",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium tracking-tight text-on-surface">
                              {account.name}
                            </p>
                            <p className="mt-0.5 text-[15px] font-light tabular-nums text-on-surface">
                              <FormattedCurrency value={balance} />
                            </p>
                            {!active ? (
                              <p className="mt-0.5 text-[11px] font-light text-on-surface-variant/75">
                                No suma al disponible
                              </p>
                            ) : (
                              <p className="mt-0.5 text-[11px] font-light text-on-surface-variant/70">
                                En Disponible hoy
                              </p>
                            )}
                          </div>
                          <Switch
                            checked={active}
                            onCheckedChange={() => toggleAccount(account.id)}
                            aria-label={
                              active
                                ? `Excluir ${account.name} del disponible`
                                : `Incluir ${account.name} en el disponible`
                            }
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : (
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
          )}
        </div>
      </Sheet>

    </div>
  );
}
