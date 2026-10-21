export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import StoreHydrator from "@/components/StoreHydrator";
import { createClient } from "@/utils/supabase/server";
import { requirePwaSession } from "@/lib/request-context";
import { perfLog, perfNow } from "@/lib/perf";

const HistoryList = dynamicImport(() => import("@/components/HistoryList"), {
  loading: () => (
    <div className="flex flex-1 items-center justify-center px-4 text-sm text-on-surface-variant">
      Cargando historial…
    </div>
  ),
});

export default async function HistoryPage() {
  const start = perfNow();
  const { user, familyId } = await requirePwaSession();
  const supabase = await createClient();

  const [familyProfilesResult, fundsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("family_id", familyId),
    supabase
      .from("family_funds")
      .select(
        "id, family_id, name, scope, owner_profile_id, is_default, is_system, sort_order, archived_at, color, purpose",
      )
      .eq("family_id", familyId)
      .is("archived_at", null)
      .order("sort_order", { ascending: true }),
  ]);

  const familyProfiles = familyProfilesResult.data ?? [];
  const financialModel = "joint_fund";
  const partner = familyProfiles.find((p) => p.id !== user.id);
  const partnerName = partner?.full_name?.trim().split(/\s+/)[0] ?? "Pareja";
  const partnerId = partner?.id ?? null;
  const funds = (fundsResult.data ?? []).filter((f) => !f.archived_at);
  perfLog("HistoryPage", { ms: perfNow() - start });

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
