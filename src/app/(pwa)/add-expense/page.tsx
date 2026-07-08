import { redirect } from "next/navigation";
import { getCurrentFamilyState } from "@/app/actions/family";
import AddExpenseForm from "@/components/AddExpenseForm";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

function getFirstName(value?: string | null, fallback = "Mi pareja") {
  const firstName = value?.trim().split(/\s+/)[0];
  return firstName || fallback;
}

export default async function AddExpensePage() {
  const familyState = await getCurrentFamilyState();
  const supabase = await createClient();

  if (!familyState.userId) {
    redirect("/login");
  }

  if (!familyState.familyId) {
    redirect("/onboarding");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let partnerFirstName = "Mi pareja";
  let financialModel = "joint_fund";
  let user1SplitPct = 50;

  if (user) {
    const { data: family } = await supabase
      .from("families")
      .select("user_1_id, user_2_id, financial_model, user_1_split_pct")
      .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
      .maybeSingle();

    financialModel = family?.financial_model ?? "joint_fund";
    user1SplitPct = Number(family?.user_1_split_pct ?? 50);

    const partnerId =
      family?.user_1_id === user.id ? family.user_2_id : family?.user_1_id ?? null;

    if (partnerId) {
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", partnerId)
        .maybeSingle();

      partnerFirstName = getFirstName(partnerProfile?.full_name);
    }
  }

  return (
    <div className="min-h-dvh bg-surface">
      <AddExpenseForm
        familyMemberCount={familyState.familyMemberCount}
        partnerFirstName={partnerFirstName}
        financialModel={financialModel}
        user1SplitPct={user1SplitPct}
      />
    </div>
  );
}
