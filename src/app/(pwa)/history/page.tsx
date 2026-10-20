export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import StoreHydrator from "@/components/StoreHydrator";

const HistoryList = dynamicImport(() => import("@/components/HistoryList"), {
  loading: () => (
    <div className="flex flex-1 items-center justify-center px-4 text-sm text-on-surface-variant">
      Cargando historial…
    </div>
  ),
});

export default async function HistoryPage() {
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

  const [familyProfilesResult, familyResult, fundsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("family_id", profile.family_id),
    supabase
      .from("families")
      .select("financial_model")
      .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
      .maybeSingle(),
    supabase
      .from("family_funds")
      .select(
        "id, family_id, name, scope, owner_profile_id, is_default, is_system, sort_order, archived_at, color, purpose",
      )
      .eq("family_id", profile.family_id)
      .is("archived_at", null)
      .order("sort_order", { ascending: true }),
  ]);

  const familyProfiles = familyProfilesResult.data ?? [];
  const financialModel = "joint_fund";
  const partner = familyProfiles.find((p) => p.id !== user.id);
  const partnerName = partner?.full_name?.trim().split(/\s+/)[0] ?? "Pareja";
  const partnerId = partner?.id ?? null;
  const funds = (fundsResult.data ?? []).filter((f) => !f.archived_at);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-page-gradient">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-page-glow" />
      <StoreHydrator userId={user.id} initialFunds={funds} />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <HistoryList
          allExpenses={[]}
          currentUserId={user.id}
          partnerName={partnerName}
          partnerId={partnerId}
          financialModel={financialModel}
          initialFunds={funds}
        />
      </div>
    </div>
  );
}
