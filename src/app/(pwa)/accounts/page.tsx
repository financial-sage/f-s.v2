export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import AccountsPanel from "@/components/AccountsPanel";
import { memberCountFromFamilyUsers } from "@/lib/household";
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

  const { data: family } = await supabase
    .from("families")
    .select("user_1_id, user_2_id")
    .eq("id", profile.family_id)
    .maybeSingle();

  const familyMemberCount = memberCountFromFamilyUsers(
    family?.user_1_id,
    family?.user_2_id
  );

  return (
    <AccountsPanel
      currentUserId={user.id}
      familyMemberCount={familyMemberCount || 1}
    />
  );
}
