export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getHomePageData } from "@/lib/dashboard";
import { buildDecisionContext } from "@/lib/decision/context";
import { selectPrimaryInsight } from "@/lib/decision/insights";

export default async function GuidancePage() {
  const home = await getHomePageData();

  if (!home.ok) {
    redirect(home.reason === "unauthenticated" ? "/login" : "/onboarding");
  }

  const {
    familyMemberCount,
    pocketBalance,
    personalBalance,
    fundBalance,
    funds,
    accountsVisibleLiquidity,
    hasVisibleAccounts,
    entitlement,
    mySpent,
    partnerSpent,
    dashboard,
  } = home.data;

  const showCoupleUi =
    entitlement?.showCoupleUi ?? (familyMemberCount >= 2 && Boolean(home.data.familyId));

  const pocketOrHeroBalance = showCoupleUi
    ? fundBalance || personalBalance || pocketBalance
    : pocketBalance;

  const insight = selectPrimaryInsight(
    buildDecisionContext({
      hasVisibleAccounts,
      accountsVisibleLiquidity,
      pocketOrHeroBalance,
      monthSpent: showCoupleUi ? mySpent + partnerSpent : dashboard.budget.spent,
      fundsCount: funds.length,
      memberCount: entitlement?.memberCount ?? familyMemberCount,
      isCoupleUi: showCoupleUi,
    })
  );

  return (
    <div className="relative min-h-dvh bg-page-gradient pb-[calc(var(--fab-clearance)+1rem)]">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-page-glow" />
      <header className="relative z-10 flex items-center gap-3 px-4 pb-2 pt-[max(0.75rem,var(--safe-top))]">
        <Link
          href="/profile"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/30 bg-surface-lowest text-on-surface shadow-sm"
          aria-label="Volver"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <p className="text-[11px] font-light text-on-surface-variant">Orientación</p>
          <h1 className="truncate text-[15px] font-medium tracking-tight text-on-surface">
            Cómo leemos tu realidad
          </h1>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-md px-4 pt-3">
        <section className="rounded-[1.85rem] border border-glass-border bg-glass p-5 shadow-[0_12px_28px_rgba(43,52,55,0.08)] backdrop-blur-xl">
          <p className="text-[11px] font-light uppercase tracking-wider text-on-surface-variant">
            Ahora mismo
          </p>
          <h2 className="mt-1 text-xl font-light tracking-tight text-on-surface">
            {insight.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            {insight.body}
          </p>

          {insight.why.length > 0 ? (
            <div className="mt-4">
              <p className="text-[11px] font-medium text-on-surface">Por qué lo sabemos</p>
              <ul className="mt-2 space-y-2">
                {insight.why.map((line) => (
                  <li
                    key={line}
                    className="rounded-2xl border border-outline-variant/25 bg-surface-low/80 px-3 py-2.5 text-sm text-on-surface"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {insight.cta ? (
            <Link
              href={insight.cta.href}
              className="mt-5 flex h-11 items-center justify-center rounded-2xl bg-primary px-4 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
            >
              {insight.cta.label}
            </Link>
          ) : null}
        </section>

        <p className="mt-4 px-1 text-center text-[11px] font-light leading-relaxed text-on-surface-variant">
          Esto no decide por ti: solo explica hechos que ya registraste. Si falta
          información, preferimos decir que aún no sabemos.
        </p>
      </main>
    </div>
  );
}
