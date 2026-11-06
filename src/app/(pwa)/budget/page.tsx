export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentFamilyState } from "@/app/actions/family";
import BudgetManager from "@/components/BudgetManager";
import SimpleBudgetSetup from "@/components/SimpleBudgetSetup";
import StoreHydrator from "@/components/StoreHydrator";
import { isSuperAdminUser } from "@/lib/admin";
import {
  SIMPLE_MODE_COOKIE_KEY,
  isSimpleModeEnabledFromCookie,
} from "@/lib/simpleMode";
import { createClient } from "@/utils/supabase/server";

export default async function BudgetPage() {
  const familyState = await getCurrentFamilyState();

  if (!familyState.userId) redirect("/login");
  if (!familyState.familyId) redirect("/onboarding");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const isSuperAdmin = await isSuperAdminUser({
    userId: familyState.userId,
    email: user?.email,
  });
  const isSimpleModeEnabled =
    isSuperAdmin &&
    isSimpleModeEnabledFromCookie(
      cookieStore.get(SIMPLE_MODE_COOKIE_KEY)?.value,
    );

  return (
    <>
      <StoreHydrator userId={familyState.userId} />
      {isSimpleModeEnabled ? (
        <SimpleBudgetSetup
          familyMemberCount={familyState.familyMemberCount}
        />
      ) : (
        <BudgetManager
          familyId={familyState.familyId}
          currentUserId={familyState.userId}
          familyMemberCount={familyState.familyMemberCount}
          initialExpenses={[]}
        />
      )}
    </>
  );
}
