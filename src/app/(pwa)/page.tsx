export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import StoreHydrator from "@/components/StoreHydrator";
import PremiumWelcomeCelebration from "@/components/PremiumWelcomeCelebration";
import { getHomePageData } from "@/lib/dashboard";
import { isSuperAdminUser } from "@/lib/admin";
import {
  SIMPLE_MODE_COOKIE_KEY,
  isSimpleModeEnabledFromCookie,
} from "@/lib/simpleMode";

const DashboardCouple = dynamicImport(() => import("@/components/DashboardCouple"), {
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-page-gradient text-sm text-on-surface-variant">
      Cargando…
    </div>
  ),
});

const DashboardSolo = dynamicImport(() => import("@/components/DashboardSolo"), {
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-page-gradient text-sm text-on-surface-variant">
      Cargando…
    </div>
  ),
});

const SimpleDashboard = dynamicImport(() => import("@/components/SimpleDashboard"), {
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-page-gradient text-sm text-on-surface-variant">
      Cargando…
    </div>
  ),
});

export default async function Home() {
  const home = await getHomePageData();

  if (!home.ok) {
    redirect(home.reason === "unauthenticated" ? "/login" : "/onboarding");
  }

  const {
    userId,
    userEmail,
    familyId,
    familyMemberCount,
    financialModel,
    currentUserName,
    partnerFirstName,
    avatarUrl,
    dashboard,
    coupleExpenses,
    mySpent,
    partnerSpent,
    fundBalance,
    personalBalance,
    pocketBalance,
    funds,
    sharedDefaultFundId,
    accountsVisibleLiquidity,
    hasVisibleAccounts,
    initialAccounts,
    entitlement,
    pendingPremiumWelcome,
  } = home.data;

  const cookieStore = await cookies();
  const isSuperAdmin = await isSuperAdminUser({
    userId,
    email: userEmail,
  });
  const isSimpleModeEnabled =
    isSuperAdmin &&
    isSimpleModeEnabledFromCookie(
      cookieStore.get(SIMPLE_MODE_COOKIE_KEY)?.value,
    );

  const showCoupleUi =
    entitlement?.showCoupleUi ?? (familyMemberCount >= 2 && Boolean(familyId));

  return (
    <>
      <StoreHydrator
        userId={userId}
        initialFunds={funds}
        initialAccounts={initialAccounts}
      />
      <PremiumWelcomeCelebration initialWelcome={pendingPremiumWelcome} />
      {isSimpleModeEnabled ? (
        <SimpleDashboard />
      ) : showCoupleUi && familyId ? (
        <DashboardCouple
          familyId={familyId}
          currentUserId={userId}
          familyName={dashboard.familyName}
          currentUserName={currentUserName}
          partnerFirstName={partnerFirstName}
          members={dashboard.members}
          expenses={coupleExpenses}
          mySpent={mySpent}
          partnerSpent={partnerSpent}
          fundBalance={fundBalance}
          personalBalance={personalBalance}
          financialModel={financialModel}
          initialFunds={funds}
          sharedDefaultFundId={sharedDefaultFundId}
          accountsVisibleLiquidity={accountsVisibleLiquidity}
          hasVisibleAccounts={hasVisibleAccounts}
          initialAccounts={initialAccounts}
          entitlement={entitlement}
        />
      ) : (
        <DashboardSolo
          currentUserId={userId}
          familyId={familyId}
          userName={currentUserName}
          avatarUrl={avatarUrl}
          budget={dashboard.budget}
          transactions={dashboard.transactions}
          pocketBalance={pocketBalance}
          accountsVisibleLiquidity={accountsVisibleLiquidity}
          hasVisibleAccounts={hasVisibleAccounts}
          initialFunds={funds}
          entitlement={entitlement}
        />
      )}
    </>
  );
}
