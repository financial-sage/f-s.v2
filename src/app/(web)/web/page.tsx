import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isEnvAdminEmail } from "@/lib/admin-emails";
import {
  canUseFullPwa,
  DESKTOP_SHELL_COOKIE,
  readForceDesktopShell,
} from "@/lib/device";
import { getHouseholdEntitlement } from "@/lib/premiumServer";
import {
  getRequestFamilyId,
  requireRequestUser,
} from "@/lib/request-context";
import { createClient } from "@/utils/supabase/server";
import WebMetricsPlaceholder from "@/components/web/WebMetricsPlaceholder";
import WebPremiumGate from "@/components/web/WebPremiumGate";

export const dynamic = "force-dynamic";

async function isAdminUser(user: {
  id: string;
  email?: string | null;
}): Promise<boolean> {
  if (isEnvAdminEmail(user.email)) return true;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_superadmin")
    .eq("id", user.id)
    .maybeSingle();

  return (data as { is_superadmin?: boolean | null } | null)?.is_superadmin === true;
}

export default async function WebMetricsPage() {
  const user = await requireRequestUser();
  const headerStore = await headers();
  const cookieStore = await cookies();
  const userAgent = headerStore.get("user-agent");
  const host = headerStore.get("host");
  const forceDesktopShell = readForceDesktopShell({
    cookieHeader: headerStore.get("cookie"),
    cookieValue: cookieStore.get(DESKTOP_SHELL_COOKIE)?.value,
    searchParams: null,
  });

  if (canUseFullPwa({ userAgent, host, forceDesktopShell })) {
    redirect("/");
  }

  if (await isAdminUser(user)) {
    redirect("/admin");
  }

  const familyId = await getRequestFamilyId(user.id);
  if (!familyId) {
    redirect("/onboarding");
  }

  const entitlement = await getHouseholdEntitlement(familyId);

  if (!entitlement?.isPremiumHousehold) {
    return <WebPremiumGate inviteCode={entitlement?.inviteCode ?? null} />;
  }

  return (
    <WebMetricsPlaceholder
      householdLabel={
        entitlement.memberCount > 1 ? "Hogar en pareja · Premium" : "Hogar · Premium"
      }
    />
  );
}
