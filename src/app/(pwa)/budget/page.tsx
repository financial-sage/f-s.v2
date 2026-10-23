export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentFamilyState } from "@/app/actions/family";
import BudgetManager from "@/components/BudgetManager";
import StoreHydrator from "@/components/StoreHydrator";

export default async function BudgetPage() {
  const familyState = await getCurrentFamilyState();

  if (!familyState.userId) redirect("/login");
  if (!familyState.familyId) redirect("/onboarding");

  return (
    <>
      <StoreHydrator userId={familyState.userId} />
      <BudgetManager
        familyId={familyState.familyId}
        currentUserId={familyState.userId}
        familyMemberCount={familyState.familyMemberCount}
        initialExpenses={[]}
      />
    </>
  );
}
