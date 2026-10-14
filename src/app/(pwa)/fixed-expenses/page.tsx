export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import FixedExpensesManager from "@/components/FixedExpensesManager";
import { createClient } from "@/utils/supabase/server";

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

  return <FixedExpensesManager />;
}
