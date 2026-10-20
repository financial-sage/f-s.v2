"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  activatePremiumForFamilyId,
  clearPendingFirstMoveCelebration,
  getHouseholdEntitlement,
  getPendingFirstMoveCelebration,
  loadFamilyBillingRow,
} from "@/lib/premiumServer";
import type { FirstMoveCelebration, HouseholdEntitlement } from "@/lib/premium";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Debes iniciar sesión.");
  return user.id;
}

async function getUserFamilyId(userId: string) {
  const { getSupabaseAdminClient } = await import("@/lib/supabase/server");
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("family_id")
    .eq("id", userId)
    .maybeSingle();
  if (!data?.family_id) throw new Error("No perteneces a una familia.");
  return data.family_id as string;
}

export async function getMyHouseholdEntitlementAction(): Promise<HouseholdEntitlement | null> {
  const userId = await requireUserId();
  const familyId = await getUserFamilyId(userId);
  return getHouseholdEntitlement(familyId);
}

export async function getPendingFirstMoveCelebrationAction(): Promise<FirstMoveCelebration | null> {
  const userId = await requireUserId();
  return getPendingFirstMoveCelebration(userId);
}

export async function dismissFirstMoveCelebrationAction() {
  const userId = await requireUserId();
  await clearPendingFirstMoveCelebration(userId);
}

/**
 * Stub until Stripe/IAP: any family member activates Premium for the household
 * by confirming their invite code.
 */
export async function activatePremiumByInviteCodeAction(inviteCode: string) {
  const userId = await requireUserId();
  const familyId = await getUserFamilyId(userId);
  const row = await loadFamilyBillingRow(familyId);
  if (!row) throw new Error("No se encontró la familia.");

  const code = inviteCode.trim().toUpperCase();
  if (!row.invite_code || row.invite_code !== code) {
    throw new Error("El código no coincide con el de tu familia.");
  }

  const until = await activatePremiumForFamilyId(familyId, 12);
  revalidatePath("/");
  revalidatePath("/profile");
  return { premiumUntil: until };
}
