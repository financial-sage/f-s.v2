"use server";

import { revalidatePath } from "next/cache";
import { isSuperAdminUser } from "@/lib/admin";
import { activatePremiumForFamilyId } from "@/lib/premiumServer";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !(await isSuperAdminUser({ userId: user.id, email: user.email }))) {
    throw new Error("No autorizado.");
  }

  return user;
}

/**
 * Mark/unmark a user as VIP.
 * Marking VIP also grants household Premium (source=vip).
 * Unmarking only clears the VIP tag — Premium stays.
 */
export async function setUserVipAction(userId: string, vip: boolean) {
  await requireSuperAdmin();

  if (!userId) throw new Error("Usuario inválido.");

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, family_id, is_vip")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    throw new Error(error?.message ?? "Usuario no encontrado.");
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      is_vip: vip,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", userId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (vip) {
    const familyId = (profile as { family_id?: string | null }).family_id;
    if (familyId) {
      await activatePremiumForFamilyId(familyId, 12, { source: "vip" });
    }
  }

  revalidatePath("/admin");
  return { ok: true as const };
}

export async function broadcastAppUpdateAdminAction() {
  await requireSuperAdmin();
  const { broadcastAppUpdate } = await import("@/lib/push-server");
  await broadcastAppUpdate();
  revalidatePath("/admin");
  return { ok: true as const };
}
