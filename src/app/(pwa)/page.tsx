export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import DashboardCouple from "@/components/DashboardCouple";
import DashboardSolo from "@/components/DashboardSolo";
import StoreHydrator from "@/components/StoreHydrator";
import { getHomePageData } from "@/lib/dashboard";

export default async function Home() {
  const home = await getHomePageData();

  if (!home.ok) {
    redirect(home.reason === "unauthenticated" ? "/login" : "/onboarding");
  }

  const {
    userId,
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
  } = home.data;

  return (
    <>
      <StoreHydrator userId={userId} />
      {familyMemberCount >= 2 && familyId ? (
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
        />
      ) : (
        <DashboardSolo
          currentUserId={userId}
          familyId={familyId}
          userName={currentUserName}
          avatarUrl={avatarUrl}
          budget={dashboard.budget}
          transactions={dashboard.transactions}
        />
      )}
    </>
  );
}
