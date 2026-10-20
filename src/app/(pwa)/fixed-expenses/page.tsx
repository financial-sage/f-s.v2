export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import { redirect } from "next/navigation";
import { memberCountFromFamilyUsers } from "@/lib/household";
import { createClient } from "@/utils/supabase/server";

const FixedExpensesManager = dynamicImport(
  () => import("@/components/FixedExpensesManager"),
  {
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-page-gradient text-sm text-on-surface-variant">
        Cargando gastos fijos…
      </div>
    ),
  }
);

export default async function FixedExpensesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.family_id) redirect("/onboarding");

  const { data: family } = await supabase
    .from("families")
    .select("user_1_id, user_2_id")
    .eq("id", profile.family_id)
    .maybeSingle();

  const familyMemberCount = memberCountFromFamilyUsers(
    family?.user_1_id,
    family?.user_2_id
  );

  return <FixedExpensesManager familyMemberCount={familyMemberCount || 1} />;
}
