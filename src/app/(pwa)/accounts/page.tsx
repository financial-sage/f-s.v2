export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

const AccountsPanel = dynamicImport(() => import("@/components/AccountsPanel"), {
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-page-gradient text-sm text-on-surface-variant">
      Cargando cuentas…
    </div>
  ),
});

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
