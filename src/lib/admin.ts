import { createAdminClient } from "@/utils/supabase/admin";

/** Comma-separated override, plus legacy single ADMIN_EMAIL. */
function envAdminEmails(): Set<string> {
  const raw = [
    process.env.ADMIN_EMAILS ?? "",
    process.env.ADMIN_EMAIL ?? "",
  ]
    .join(",")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return new Set(raw);
}

export function isEnvAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return envAdminEmails().has(email.trim().toLowerCase());
}

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
