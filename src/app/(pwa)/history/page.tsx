export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import HistoryList from "@/components/HistoryList";
import StoreHydrator from "@/components/StoreHydrator";
import { PageHeader } from "@/components/ui/PageHeader";

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

  const [familyProfilesResult, familyResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("family_id", profile.family_id),
    supabase
      .from("families")
      .select("financial_model")
      .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
      .maybeSingle(),
  ]);

  const familyProfiles = familyProfilesResult.data ?? [];
  const financialModel = familyResult.data?.financial_model ?? "joint_fund";
  const partner = familyProfiles.find((p) => p.id !== user.id);
  const partnerName = partner?.full_name?.trim().split(/\s+/)[0] ?? "Pareja";
  const partnerId = partner?.id ?? null;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-linear-to-b from-[#f3f5f0] via-[#e8ede4] to-[#d5dfd0]">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(ellipse_at_bottom,_rgba(74,101,73,0.16),_transparent_70%)]" />
      <StoreHydrator userId={user.id} />
      <PageHeader
        title="Historial"
        subtitle="Todos tus movimientos"
        backHref="/"
        className="relative z-20 border-b-0 bg-transparent backdrop-blur-0"
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <HistoryList
          allExpenses={[]}
          currentUserId={user.id}
          partnerName={partnerName}
          partnerId={partnerId}
          financialModel={financialModel}
        />
      </div>
    </div>
  );
}
