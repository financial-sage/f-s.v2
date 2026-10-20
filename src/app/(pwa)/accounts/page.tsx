export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import AccountsPanel from "@/components/AccountsPanel";
import { createClient } from "@/utils/supabase/server";

export default async function AccountsPage() {
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

  return <AccountsPanel currentUserId={user.id} />;
}
