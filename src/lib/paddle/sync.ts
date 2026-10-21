import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { PADDLE_ACTIVE_STATUSES } from "@/lib/paddle/config";

type SubRow = {
  user_id: string;
  family_id: string | null;
  status: string;
  current_period_end: string | null;
};

/**
 * Recompute household Premium from Paddle subscriptions of its members.
 * - Any active paid sub → Premium + premium_source=paid
 * - No active paid sub → if source was paid, fall back to VIP grant or clear
 */
export async function syncFamilyPremiumFromBilling(familyId: string) {
  const admin = getSupabaseAdminClient();

  const { data: family } = await admin
    .from("families")
    .select("id, user_1_id, user_2_id, premium_source, is_premium_household")
    .eq("id", familyId)
    .maybeSingle();

  if (!family) return;

  const memberIds = [family.user_1_id, family.user_2_id].filter(
    Boolean
  ) as string[];
  if (!memberIds.length) return;

  const wasPremium =
    (family as { is_premium_household?: boolean }).is_premium_household === true;

  const { data: subs } = await admin
    .from("billing_subscriptions")
    .select("user_id, family_id, status, current_period_end")
    .in("user_id", memberIds);

  const active = ((subs ?? []) as SubRow[]).filter((s) =>
    PADDLE_ACTIVE_STATUSES.has(s.status)
  );

  const { data: vipProfiles } = await admin
    .from("profiles")
    .select("id, is_vip")
    .in("id", memberIds);

  const hasVip = ((vipProfiles ?? []) as { id: string; is_vip?: boolean }[]).some(
    (p) => p.is_vip
  );

  if (active.length > 0) {
    const ends = active
      .map((s) => (s.current_period_end ? Date.parse(s.current_period_end) : NaN))
      .filter((n) => Number.isFinite(n)) as number[];
    const premiumUntil =
      ends.length > 0
        ? new Date(Math.max(...ends)).toISOString()
        : null;

    await admin
      .from("families")
      .update({
        is_premium_household: true,
        premium_until: premiumUntil,
        premium_source: "paid",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", familyId);

    await admin
      .from("profiles")
      .update({ is_premium: true } as never)
      .in("id", memberIds);

    // Keep family_id on the payer's subscription rows when possible.
    await admin
      .from("billing_subscriptions")
      .update({ family_id: familyId, updated_at: new Date().toISOString() } as never)
      .in("user_id", memberIds);

    if (!wasPremium) {
      const { queuePremiumWelcomeForFamily } = await import(
        "@/lib/premiumServer"
      );
      await queuePremiumWelcomeForFamily(familyId, "paid");
    }

    return;
  }

  const source = (family as { premium_source?: string | null }).premium_source;

  // Paid Premium ended — VIP friends keep free Premium.
  if (hasVip) {
    await admin
      .from("families")
      .update({
        is_premium_household: true,
        premium_until: null,
        premium_source: "vip",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", familyId);

    await admin
      .from("profiles")
      .update({ is_premium: true } as never)
      .in("id", memberIds);

    if (!wasPremium) {
      const { queuePremiumWelcomeForFamily } = await import(
        "@/lib/premiumServer"
      );
      await queuePremiumWelcomeForFamily(familyId, "vip");
    }
    return;
  }

  // Only clear when this household was marked as paid (don't wipe stub/campaign).
  if (source === "paid" || source == null) {
    if (source === "paid") {
      await admin
        .from("families")
        .update({
          is_premium_household: false,
          premium_until: null,
          premium_source: null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", familyId);

      await admin
        .from("profiles")
        .update({ is_premium: false } as never)
        .in("id", memberIds);
    }
  }
}

/** Sync every family linked to this user (profile.family_id). */
export async function syncUserPremiumFromBilling(userId: string) {
  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("family_id")
    .eq("id", userId)
    .maybeSingle();

  const familyId = (profile as { family_id?: string | null } | null)?.family_id;
  if (familyId) {
    await syncFamilyPremiumFromBilling(familyId);
  }
}

export async function householdHasActivePaidSubscription(
  memberIds: string[]
): Promise<boolean> {
  if (!memberIds.length) return false;
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("billing_subscriptions")
    .select("status")
    .in("user_id", memberIds);

  return ((data ?? []) as { status: string }[]).some((s) =>
    PADDLE_ACTIVE_STATUSES.has(s.status)
  );
}
