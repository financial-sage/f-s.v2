export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import BudgetManager from "@/components/BudgetManager";
import StoreHydrator from "@/components/StoreHydrator";

export default async function BudgetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) redirect("/onboarding");

  return (
    <>
      <StoreHydrator userId={user.id} />
      <BudgetManager familyId={profile.family_id} initialExpenses={[]} />
    </>
  );
}
