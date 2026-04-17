"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";

interface FamilyRow {
  id: string;
  user_1_id: string;
  user_2_id: string | null;
  invite_code: string | null;
}

interface CompleteRegistrationInput {
  userId: string;
  fullName?: string;
  inviteCode?: string | null;
}

const INVITE_CODE_LENGTH = 6;
const INVITE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createRandomInviteCode() {
  return Array.from({ length: INVITE_CODE_LENGTH }, () => {
    const index = Math.floor(Math.random() * INVITE_CHARSET.length);
    return INVITE_CHARSET[index];
  }).join("");
}

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

async function findCurrentFamily(userId: string) {
  const admin = getSupabaseAdminClient();

  const { data: family } = await admin
    .from("families")
    .select("id, user_1_id, user_2_id, invite_code")
    .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`)
    .limit(1)
    .maybeSingle<FamilyRow>();

  return family;
}

async function generateUniqueInviteCode() {
  const admin = getSupabaseAdminClient();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const inviteCode = createRandomInviteCode();
    const { data: existing } = await admin
      .from("families")
      .select("id")
      .eq("invite_code", inviteCode)
      .maybeSingle();

    if (!existing) {
      return inviteCode;
    }
  }

  throw new Error("No se pudo generar un código único.");
}

async function resolveProfileName(userId: string, fallbackName?: string | null) {
  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle<{ full_name?: string | null }>();

  return profile?.full_name?.trim() || fallbackName?.trim() || null;
}

export async function completeUserRegistration({
  userId,
  fullName,
  inviteCode,
}: CompleteRegistrationInput) {
  if (!userId) {
    throw new Error("Usuario inválido.");
  }

  const admin = getSupabaseAdminClient();
  const normalizedFullName = fullName?.trim() ?? "";
  const normalizedInviteCode = inviteCode?.trim().toUpperCase() ?? "";

  let familyId: string;

  if (normalizedInviteCode) {
    if (!/^[A-Z0-9]{6}$/.test(normalizedInviteCode)) {
      throw new Error("Ingresa un código válido de 6 caracteres.");
    }

    const { data: family, error: familyLookupError } = await admin
      .from("families")
      .select("id, user_1_id, user_2_id, invite_code")
      .eq("invite_code", normalizedInviteCode)
      .maybeSingle<FamilyRow>();

    if (familyLookupError || !family?.id) {
      throw familyLookupError ?? new Error("Código de invitación inválido.");
    }

    if (family.user_1_id !== userId && family.user_2_id && family.user_2_id !== userId) {
      throw new Error("Esta familia ya tiene dos miembros.");
    }

    if (family.user_1_id !== userId && !family.user_2_id) {
      const { error: familyUpdateError } = await admin
        .from("families")
        .update({ user_2_id: userId } as never)
        .eq("id", family.id);

      if (familyUpdateError) {
        throw new Error(familyUpdateError.message);
      }
    }

    familyId = family.id;
  } else {
    const nextInviteCode = await generateUniqueInviteCode();

    const { data: createdFamily, error: familyError } = await admin
      .from("families")
      .insert({
        name: normalizedFullName || "Mi familia",
        user_1_id: userId,
        user_2_id: null,
        invite_code: nextInviteCode,
      } as never)
      .select("id")
      .single();

    if (familyError || !createdFamily?.id) {
      throw familyError ?? new Error("No se pudo crear la familia.");
    }

    familyId = createdFamily.id;
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    full_name: normalizedFullName || null,
    family_id: familyId,
  } as never);

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/add-expense");

  return { familyId };
}

export async function createSoloFamilyAction(userId: string) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!userId || user.id !== userId) {
    throw new Error("Usuario inválido.");
  }

  const existingFamily = await findCurrentFamily(user.id);

  if (existingFamily?.id) {
    if (existingFamily.user_1_id === user.id && !existingFamily.user_2_id) {
      const code = existingFamily.invite_code ?? (await ensureFamilyInviteCode());
      return {
        familyId: existingFamily.id,
        code,
      };
    }

    throw new Error("Ya tienes una familia configurada.");
  }

  const admin = getSupabaseAdminClient();
  const code = await generateUniqueInviteCode();
  const fullName = await resolveProfileName(user.id, user.user_metadata?.full_name as string | undefined);

  const { data: createdFamily, error: familyError } = await admin
    .from("families")
    .insert({
      user_1_id: user.id,
      user_2_id: null,
      invite_code: code,
      name: fullName ? `Familia de ${fullName}` : "Mi familia",
    } as never)
    .select("id")
    .single();

  if (familyError || !createdFamily?.id) {
    throw familyError ?? new Error("No se pudo crear la familia.");
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    full_name: fullName,
    family_id: createdFamily.id,
  } as never);

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/onboarding");

  return {
    familyId: createdFamily.id,
    code,
  };
}

export async function joinFamilyAction(userId: string, inviteCode: string) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!userId || user.id !== userId) {
    throw new Error("Usuario inválido.");
  }

  const code = inviteCode.trim().toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(code)) {
    throw new Error("Ingresa un código válido de 6 caracteres.");
  }

  const admin = getSupabaseAdminClient();
  const currentFamily = await findCurrentFamily(user.id);

  const { data: family, error: familyError } = await admin
    .from("families")
    .select("id, user_1_id, user_2_id, invite_code")
    .eq("invite_code", code)
    .maybeSingle<FamilyRow>();

  if (currentFamily?.id) {
    if (currentFamily.id === family?.id) {
      return { success: true, familyId: currentFamily.id };
    }

    throw new Error("Ya perteneces a una familia.");
  }

  if (familyError || !family?.id) {
    throw familyError ?? new Error("Código de invitación inválido.");
  }

  if (family.user_2_id && family.user_2_id !== user.id) {
    throw new Error("Familia completa");
  }

  if (family.user_1_id !== user.id && !family.user_2_id) {
    const { error: joinError } = await admin
      .from("families")
      .update({ user_2_id: user.id, invite_code: null } as never)
      .eq("id", family.id);

    if (joinError) {
      throw new Error(joinError.message);
    }
  }

  const fullName = await resolveProfileName(user.id, user.user_metadata?.full_name as string | undefined);
  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    full_name: fullName,
    family_id: family.id,
  } as never);

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath("/");
  revalidatePath("/profile");
  revalidatePath("/onboarding");

  return { success: true, familyId: family.id };
}

export async function ensureFamilyInviteCode() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const family = await findCurrentFamily(user.id);

  if (!family?.id) {
    redirect("/onboarding");
  }

  if (family.invite_code) {
    return family.invite_code;
  }

  const inviteCode = await generateUniqueInviteCode();
  const admin = getSupabaseAdminClient();

  const { error } = await admin
    .from("families")
    .update({ invite_code: inviteCode } as never)
    .eq("id", family.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/profile");

  return inviteCode;
}

export async function getCurrentFamilyState() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      userId: null,
      familyId: null,
      familyMemberCount: 0,
      inviteCode: null,
    };
  }

  const family = await findCurrentFamily(user.id);
  const familyMemberCount = [family?.user_1_id, family?.user_2_id].filter(Boolean).length;
  const inviteCode = family?.id ? family.invite_code ?? (await ensureFamilyInviteCode()) : null;

  return {
    userId: user.id,
    familyId: family?.id ?? null,
    familyMemberCount,
    inviteCode,
  };
}

export async function joinFamilyWithCode(inviteCode: string) {
  const code = inviteCode.trim().toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(code)) {
    throw new Error("Ingresa un código válido de 6 caracteres.");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const admin = getSupabaseAdminClient();
  const currentFamily = await findCurrentFamily(user.id);

  const { data: targetFamily, error: targetFamilyError } = await admin
    .from("families")
    .select("id, user_1_id, user_2_id, invite_code")
    .eq("invite_code", code)
    .maybeSingle<FamilyRow>();

  if (targetFamilyError || !targetFamily) {
    throw new Error("Código de invitación inválido.");
  }

  if (currentFamily?.id === targetFamily.id) {
    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath("/add-expense");
    return { success: true };
  }

  if (currentFamily?.id) {
    const isSoloOwner = currentFamily.user_1_id === user.id && !currentFamily.user_2_id;

    if (!isSoloOwner) {
      throw new Error("Ya perteneces a una familia.");
    }

    const { error: deleteError } = await admin
      .from("families")
      .delete()
      .eq("id", currentFamily.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
  }

  if (
    targetFamily.user_1_id &&
    targetFamily.user_2_id &&
    targetFamily.user_1_id !== user.id &&
    targetFamily.user_2_id !== user.id
  ) {
    throw new Error("Esta familia ya tiene dos miembros.");
  }

  if (targetFamily.user_1_id !== user.id && !targetFamily.user_2_id) {
    const { error: joinError } = await admin
      .from("families")
      .update({ user_2_id: user.id } as never)
      .eq("id", targetFamily.id);

    if (joinError) {
      throw new Error(joinError.message);
    }
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: user.id,
    family_id: targetFamily.id,
  } as never);

  if (profileError) {
    throw new Error(profileError.message);
  }

  revalidatePath("/");
  revalidatePath("/add-expense");
  revalidatePath("/profile");
  revalidatePath("/onboarding");

  return { success: true };
}
