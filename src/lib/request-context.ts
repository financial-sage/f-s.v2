import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";
import { memberCountFromFamilyUsers } from "@/lib/household";
import { perfLog, perfNow } from "@/lib/perf";

/**
 * Per-request auth/family context (React.cache).
 * Dedupes auth.getUser + profiles.family_id across RSC pages and server actions
 * that share the same render/request tree.
 */

export const getRequestUser = cache(async (): Promise<User | null> => {
  const start = perfNow();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  perfLog("getRequestUser", { ms: perfNow() - start, hit: Boolean(user) });
  return user;
});

/** Redirects to /login when unauthenticated. */
export const requireRequestUser = cache(async (): Promise<User> => {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  return user;
});

export const getRequestFamilyId = cache(
  async (userId: string): Promise<string | null> => {
    const start = perfNow();
    const admin = getSupabaseAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("family_id")
      .eq("id", userId)
      .maybeSingle();
    perfLog("getRequestFamilyId", {
      ms: perfNow() - start,
      ok: Boolean(!error && profile?.family_id),
    });
    if (error || !profile?.family_id) return null;
    return profile.family_id as string;
  }
);

/** Throws if the user has no family (for mutations). */
export async function requireRequestFamilyId(userId: string): Promise<string> {
  const familyId = await getRequestFamilyId(userId);
  if (!familyId) {
    throw new Error("Debes pertenecer a una familia.");
  }
  return familyId;
}

export const getRequestFamilyMemberCount = cache(
  async (familyId: string): Promise<number> => {
    const start = perfNow();
    const admin = getSupabaseAdminClient();
    const { data: family } = await admin
      .from("families")
      .select("user_1_id, user_2_id")
      .eq("id", familyId)
      .maybeSingle();
    const count = memberCountFromFamilyUsers(
      family?.user_1_id,
      family?.user_2_id
    );
    perfLog("getRequestFamilyMemberCount", {
      ms: perfNow() - start,
      count: count || 1,
    });
    return count || 1;
  }
);

/**
 * Common PWA page bootstrap: user + familyId, redirects if missing.
 * Collapses the usual getUser → profile waterfall into two cached hops.
 */
export async function requirePwaSession(): Promise<{
  user: User;
  familyId: string;
}> {
  const start = perfNow();
  const user = await requireRequestUser();
  const familyId = await getRequestFamilyId(user.id);
  if (!familyId) redirect("/onboarding");
  perfLog("requirePwaSession", { ms: perfNow() - start });
  return { user, familyId };
}
