export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getHomePageData } from "@/lib/dashboard";
import { buildDecisionContext } from "@/lib/decision/context";
import {
  selectPrimaryInsight,
  selectPrimaryRecommendation,
} from "@/lib/decision/insights";
import { sumMonthSpend } from "@/lib/decision/spend";
import {
  calculateFundCashBalance,
  calculateSoloPersonalFundBalance,
  getDefaultSharedFund,
  getPersonalFund,
  isFixedExpensesFund,
  listActiveFunds,
  listSoloDashboardFunds,
  personalFundDisplayName,
} from "@/lib/funds";

function formatAmount(value: number): string {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default async function GuidancePage() {
  const home = await getHomePageData();

  if (!home.ok) {
    redirect(home.reason === "unauthenticated" ? "/login" : "/onboarding");
  }

  const {
    userId,
    familyMemberCount,
    pocketBalance,
    personalBalance,
    fundBalance,
    funds,
    accountsVisibleLiquidity,
    hasVisibleAccounts,
    entitlement,
    coupleExpenses,
  } = home.data;

  const showCoupleUi =
    entitlement?.showCoupleUi ?? (familyMemberCount >= 2 && Boolean(home.data.familyId));

  const pocketOrHeroBalance = showCoupleUi
    ? fundBalance || personalBalance || pocketBalance
    : pocketBalance;

  const expenseRows = coupleExpenses.map((e) => ({
    amount: Number(e.amount),
    paid_by: e.paid_by,
    category: e.category,
    responsible_for: e.responsible_for,
    paid_from_fund: e.paid_from_fund,
    fund_id: e.fund_id,
    account_id: e.account_id,
    transfer_group_id: e.transfer_group_id,
    expense_date: e.expense_date,
    is_active: true,
  }));

  let activePocketName: string | null = null;
  let pockets: { name: string; balance: number }[] = [];

  if (showCoupleUi) {
    const dashboardFunds = listActiveFunds(funds).filter((f) => !isFixedExpensesFund(f));
    const legacySharedId = getDefaultSharedFund(funds)?.id ?? null;
    pockets = dashboardFunds.map((fund) => ({
      name: fund.scope === "personal" ? personalFundDisplayName(fund) : fund.name,
      balance: calculateFundCashBalance(expenseRows, fund.id, {
        treatLegacyJointAsFundId: legacySharedId,
      }),
    }));
    activePocketName = pockets[0]?.name ?? "Bolsillo";
  } else {
    const personalFunds = listSoloDashboardFunds(funds, userId);
    const defaultPersonal = getPersonalFund(personalFunds, userId);
    pockets = personalFunds.map((fund) => ({
      name: personalFundDisplayName(fund, {
        primaryId: defaultPersonal?.id ?? null,
      }),
      balance: calculateSoloPersonalFundBalance(
        expenseRows,
        fund,
        userId,
        defaultPersonal?.id ?? null
      ),
    }));
    activePocketName =
      personalFundDisplayName(defaultPersonal, {
        primaryId: defaultPersonal?.id ?? null,
      }) || pockets[0]?.name || null;
  }

  const monthSpent = sumMonthSpend(expenseRows);
  const pocketsTotal =
    Math.round(pockets.reduce((sum, p) => sum + p.balance, 0) * 100) / 100;

  const ctx = buildDecisionContext({
    hasVisibleAccounts,
    accountsVisibleLiquidity,
    pocketOrHeroBalance,
    activePocketName,
    pockets,
    monthSpent,
    fundsCount: funds.length,
    memberCount: entitlement?.memberCount ?? familyMemberCount,
    isCoupleUi: showCoupleUi,
  });

  const insight = selectPrimaryInsight(ctx);
  const recommendation = selectPrimaryRecommendation(ctx);
  const showMoneyMap = hasVisibleAccounts || pockets.length > 0 || monthSpent > 0;

  return (
    <div className="relative min-h-dvh bg-page-gradient pb-[calc(var(--fab-clearance)+1rem)]">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-page-glow" />
      <header className="relative z-10 flex items-center gap-3 px-4 pb-2 pt-[max(0.75rem,var(--safe-top))]">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-lowest text-on-surface shadow-sm"
          aria-label="Volver"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <p className="text-[11px] font-light text-on-surface-variant">Orientación</p>
          <h1 className="truncate text-[15px] font-medium tracking-tight text-on-surface">
            {insight.title}
          </h1>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-3">
        <p className="px-1 text-[14px] font-light leading-relaxed text-on-surface/75">
          {insight.pageLead}
        </p>

        {showMoneyMap ? (
          <section className="rounded-[1.85rem] border border-glass-border bg-surface-lowest/90 p-6 shadow-[0_12px_28px_rgba(43,52,55,0.06)] backdrop-blur-xl">
            <p className="text-[11px] font-light tracking-[0.14em] text-on-surface-variant/80">
              Dónde está tu dinero
            </p>

            {hasVisibleAccounts ? (
              <div className="mt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13px] font-light text-on-surface/70">Cuentas</p>
                  <p className="text-[1.35rem] font-light tabular-nums tracking-tight text-on-surface">
                    {formatAmount(accountsVisibleLiquidity)} €
                  </p>
                </div>
              </div>
            ) : null}

            {pockets.length > 0 ? (
              <div
                className={
                  hasVisibleAccounts
                    ? "mt-5 border-t border-on-surface/[0.06] pt-5"
                    : "mt-4"
                }
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[13px] font-light text-on-surface/70">Bolsillos</p>
                  <p className="text-[1.35rem] font-light tabular-nums tracking-tight text-on-surface">
                    {formatAmount(pocketsTotal)} €
                  </p>
                </div>
                <ul className="mt-3 space-y-2">
                  {pockets.map((pocket) => (
                    <li
                      key={pocket.name}
                      className="flex items-baseline justify-between gap-3 text-[13px] font-light"
                    >
                      <span className="min-w-0 truncate text-on-surface/65">
                        «{pocket.name}»
                      </span>
                      <span className="shrink-0 tabular-nums text-on-surface/80">
                        {formatAmount(pocket.balance)} €
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div
              className={
                hasVisibleAccounts || pockets.length > 0
                  ? "mt-5 border-t border-on-surface/[0.06] pt-5"
                  : "mt-4"
              }
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-light text-on-surface/70">
                  Gastado este mes
                </p>
                <p className="text-[1.35rem] font-light tabular-nums tracking-tight text-on-surface">
                  {formatAmount(monthSpent)} €
                </p>
              </div>
              <p className="mt-2 text-[12px] font-light leading-relaxed text-on-surface-variant/80">
                Solo gastos reales (sin aportes ni traspasos).
              </p>
              {monthSpent > 0 ? (
                <Link
                  href="/history"
                  className="mt-3 inline-block text-[12px] font-light text-on-surface/70 underline-offset-4 hover:text-on-surface hover:underline"
                >
                  Ver en qué se ha ido
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

        {recommendation ? (
          <section className="rounded-[1.85rem] border border-glass-border bg-surface-lowest/90 p-6 shadow-[0_12px_28px_rgba(43,52,55,0.06)] backdrop-blur-xl">
            <p className="text-[11px] font-light tracking-[0.14em] text-on-surface-variant/80">
              Te sugerimos
            </p>
            <h2 className="mt-2 max-w-[22ch] text-[1.35rem] font-light leading-[1.25] tracking-tight text-on-surface">
              {recommendation.title}
            </h2>
            <p className="mt-3 text-[15px] font-light leading-7 text-on-surface/80">
              {recommendation.body}
            </p>
            {recommendation.cta ? (
              <Link
                href={recommendation.cta.href}
                className="mt-6 flex h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
              >
                {recommendation.cta.label}
              </Link>
            ) : null}
          </section>
        ) : null}

        <p className="px-2 pb-2 text-center text-[11px] font-light leading-relaxed text-on-surface-variant/85">
          Saber dónde está el dinero y ayudarte a organizarlo — sin decidir por ti.
        </p>
      </main>
    </div>
  );
}
