import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  COUPLE_PAUSED_MESSAGE,
  COUPLE_TRIAL_DAYS,
  FREE_ACCOUNTS_LIMIT,
  FREE_EXTRA_FUNDS_LIMIT,
  FREE_FIXED_EXPENSES_LIMIT,
  PREMIUM_REQUIRED_MESSAGE,
  parseFirstMoveCelebration,
  resolveHouseholdEntitlement,
  type FamilyBillingRow,
  type FirstMoveCelebration,
  type HouseholdEntitlement,
} from "@/lib/premium";

const FAMILY_BILLING_SELECT =
  "id, user_1_id, user_2_id, invite_code, couple_trial_started_at, couple_trial_ends_at, is_premium_household, premium_until, first_movement_at, first_movement_by";

export async function loadFamilyBillingRow(
  familyId: string
): Promise<FamilyBillingRow | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("families")
    .select(FAMILY_BILLING_SELECT)
    .eq("id", familyId)
    .maybeSingle();

  if (!error && data) return data as FamilyBillingRow;

  // Migration not applied yet — fall back to core columns.
  const { data: basic } = await admin
    .from("families")
    .select("id, user_1_id, user_2_id, invite_code")
    .eq("id", familyId)
    .maybeSingle();

  if (!basic) return null;
  return {
    ...(basic as Pick<
      FamilyBillingRow,
      "id" | "user_1_id" | "user_2_id" | "invite_code"
    >),
    couple_trial_started_at: null,
    couple_trial_ends_at: null,
    is_premium_household: false,
    premium_until: null,
    first_movement_at: null,
    first_movement_by: null,
  };
}

export async function getHouseholdEntitlement(
  familyId: string
): Promise<HouseholdEntitlement | null> {
  const row = await loadFamilyBillingRow(familyId);
  if (!row) return null;
  return resolveHouseholdEntitlement(row);
}

export async function requireHouseholdEntitlement(
  familyId: string
): Promise<HouseholdEntitlement> {
  const entitlement = await getHouseholdEntitlement(familyId);
  if (!entitlement) throw new Error("No se encontró la familia.");
  return entitlement;
}

export async function assertCanCreateExtraFund(familyId: string) {
  const entitlement = await requireHouseholdEntitlement(familyId);
  if (entitlement.unlimitedQuotas) return;

  const admin = getSupabaseAdminClient();
  const { count, error } = await admin
    .from("family_funds")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId)
    .eq("is_system", false)
    .is("archived_at", null)
    .eq("purpose", "general");

  if (error) {
    // purpose column may be missing on very old DBs — fall back without purpose filter
    const fallback = await admin
      .from("family_funds")
      .select("id", { count: "exact", head: true })
      .eq("family_id", familyId)
      .eq("is_system", false)
      .is("archived_at", null);
    const n = fallback.count ?? 0;
    if (n >= FREE_EXTRA_FUNDS_LIMIT) throw new Error(PREMIUM_REQUIRED_MESSAGE);
    return;
  }

  if ((count ?? 0) >= FREE_EXTRA_FUNDS_LIMIT) {
    throw new Error(PREMIUM_REQUIRED_MESSAGE);
  }
}

export async function assertCanCreateAccount(familyId: string) {
  const entitlement = await requireHouseholdEntitlement(familyId);
  if (entitlement.unlimitedQuotas) return;

  const admin = getSupabaseAdminClient();
  const { count } = await admin
    .from("family_accounts")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId)
    .is("archived_at", null);

  if ((count ?? 0) >= FREE_ACCOUNTS_LIMIT) {
    throw new Error(PREMIUM_REQUIRED_MESSAGE);
  }
}

export async function assertCanCreateFixedExpense(familyId: string) {
  const entitlement = await requireHouseholdEntitlement(familyId);
  if (entitlement.unlimitedQuotas) return;

  const admin = getSupabaseAdminClient();
  const { count } = await admin
    .from("fixed_expenses")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId)
    .eq("is_active", true);

  if ((count ?? 0) >= FREE_FIXED_EXPENSES_LIMIT) {
    throw new Error(PREMIUM_REQUIRED_MESSAGE);
  }
}

export async function assertCoupleFeaturesAllowed(familyId: string) {
  const entitlement = await requireHouseholdEntitlement(familyId);
  if (!entitlement.canUseCoupleFeatures && entitlement.memberCount >= 2) {
    throw new Error(COUPLE_PAUSED_MESSAGE);
  }
}

/**
 * After inserting an expense/income: if this is the household's first movement
 * and both members are present, start the 7-day trial and queue celebration
 * for the partner.
 */
export async function maybeStartCoupleTrialOnFirstMovement(input: {
  familyId: string;
  actorUserId: string;
  kind: "expense" | "income";
}): Promise<{ started: boolean; kind: "expense" | "income" }> {
  const admin = getSupabaseAdminClient();
  const row = await loadFamilyBillingRow(input.familyId);
  if (!row || !row.user_2_id) return { started: false, kind: input.kind };
  if (row.first_movement_at || row.couple_trial_started_at) {
    return { started: false, kind: input.kind };
  }

  const started = new Date();
  const ends = new Date(started);
  ends.setUTCDate(ends.getUTCDate() + COUPLE_TRIAL_DAYS);

  // Prefer null-guard on first_movement_at; if column missing, try without filter.
  let updated: { id: string } | null = null;
  {
    const attempt = await admin
      .from("families")
      .update({
        first_movement_at: started.toISOString(),
        first_movement_by: input.actorUserId,
        couple_trial_started_at: started.toISOString(),
        couple_trial_ends_at: ends.toISOString(),
        updated_at: started.toISOString(),
      } as never)
      .eq("id", input.familyId)
      .is("first_movement_at", null)
      .select("id")
      .maybeSingle();

    if (!attempt.error) {
      updated = attempt.data as { id: string } | null;
    } else {
      // Columns may not exist yet — don't block expense save
      return { started: false, kind: input.kind };
    }
  }

  if (!updated) return { started: false, kind: input.kind };

  const partnerId =
    row.user_1_id === input.actorUserId ? row.user_2_id : row.user_1_id;

  const { data: actorProfile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", input.actorUserId)
    .maybeSingle();

  const fromName =
    (actorProfile as { full_name?: string | null } | null)?.full_name?.trim() ||
    "Tu pareja";

  const at = started.toISOString();
  const base = {
    fromUserId: input.actorUserId,
    fromName,
    kind: input.kind,
    at,
  };

  // Partner sees "{name} registró…"; actor sees their own confirmation.
  await admin
    .from("profiles")
    .update({
      pending_first_move_celebration: { ...base, role: "actor" },
    } as never)
    .eq("id", input.actorUserId);

  if (partnerId) {
    await admin
      .from("profiles")
      .update({
        pending_first_move_celebration: { ...base, role: "partner" },
      } as never)
      .eq("id", partnerId);
  }

  return { started: true, kind: input.kind };
}

export async function getPendingFirstMoveCelebration(
  userId: string
): Promise<FirstMoveCelebration | null> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("pending_first_move_celebration")
    .eq("id", userId)
    .maybeSingle();

  return parseFirstMoveCelebration(
    (data as { pending_first_move_celebration?: unknown } | null)
      ?.pending_first_move_celebration
  );
}

export async function clearPendingFirstMoveCelebration(userId: string) {
  const admin = getSupabaseAdminClient();
  await admin
    .from("profiles")
    .update({ pending_first_move_celebration: null } as never)
    .eq("id", userId);
}

/** Stub / beta: activate household Premium by invite code (any member). */
export async function activatePremiumForFamilyId(
  familyId: string,
  months = 12
) {
  const admin = getSupabaseAdminClient();
  const until = new Date();
  until.setUTCMonth(until.getUTCMonth() + months);

  const { data: family, error } = await admin
    .from("families")
    .update({
      is_premium_household: true,
      premium_until: until.toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", familyId)
    .select("user_1_id, user_2_id")
    .maybeSingle();

  if (error || !family) {
    throw new Error(error?.message ?? "No se pudo activar Premium.");
  }

  const ids = [family.user_1_id, family.user_2_id].filter(Boolean) as string[];
  if (ids.length) {
    await admin
      .from("profiles")
      .update({ is_premium: true } as never)
      .in("id", ids);
  }

  return until.toISOString();
}
