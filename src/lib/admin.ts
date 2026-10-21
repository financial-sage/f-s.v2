import { createAdminClient } from "@/utils/supabase/admin";
import { isEnvAdminEmail } from "@/lib/admin-emails";

export { isEnvAdminEmail } from "@/lib/admin-emails";

/** Superadmin = profiles.is_superadmin or ADMIN_EMAIL / ADMIN_EMAILS allowlist. */
export async function isSuperAdminUser(params: {
  userId: string;
  email?: string | null;
}): Promise<boolean> {
  if (isEnvAdminEmail(params.email)) {
    return true;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("is_superadmin")
    .eq("id", params.userId)
    .maybeSingle();

  return (data as { is_superadmin?: boolean | null } | null)?.is_superadmin === true;
}
