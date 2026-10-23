"use server";

import { revalidatePath } from "next/cache";
import {
  activatePremiumForFamilyId,
  clearPendingFirstMoveCelebration,
  clearPendingPremiumWelcome,
  getHouseholdEntitlement,
  getPendingFirstMoveCelebration,
  getPendingPremiumWelcome,
  loadFamilyBillingRow,
} from "@/lib/premiumServer";
import type {
  FirstMoveCelebration,
  HouseholdEntitlement,
  PremiumWelcomeCelebration,
} from "@/lib/premium";
import {
  getRequestUser,
  requireRequestFamilyId,
} from "@/lib/request-context";

async function requireUserId() {
  const user = await getRequestUser();
  if (!user) throw new Error("Debes iniciar sesión.");
  return user.id;
}

async function getUserFamilyId(userId: string) {
  return requireRequestFamilyId(userId);
}

export async function getMyHouseholdEntitlementAction(): Promise<HouseholdEntitlement | null> {
  const userId = await requireUserId();
  const familyId = await getUserFamilyId(userId);
  return getHouseholdEntitlement(familyId);
}

export async function getPendingFirstMoveCelebrationAction(): Promise<FirstMoveCelebration | null> {
  // Soft check: layout mounts this on /login before auth; never 500.
  const user = await getRequestUser();
  if (!user) return null;
  return getPendingFirstMoveCelebration(user.id);
}

export async function dismissFirstMoveCelebrationAction() {
  const user = await getRequestUser();
  if (!user) return;
  await clearPendingFirstMoveCelebration(user.id);
}

export async function getPendingPremiumWelcomeAction(): Promise<PremiumWelcomeCelebration | null> {
  const user = await getRequestUser();
  if (!user) return null;
  return getPendingPremiumWelcome(user.id);
}

export async function dismissPremiumWelcomeAction() {
  const user = await getRequestUser();
  if (!user) return;
  await clearPendingPremiumWelcome(user.id);
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
