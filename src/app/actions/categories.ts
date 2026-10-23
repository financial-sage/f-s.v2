"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";
import {
  BASIC_SHARED_CATEGORY_SEEDS,
  mapCategoryRow,
  type CategoryScope,
  type FamilyCategory,
} from "@/lib/familyCategories";
import {
  isIndividualHousehold,
  memberCountFromFamilyUsers,
} from "@/lib/household";

async function requireUserAndFamily() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = getSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile?.family_id) {
    throw new Error("Debes pertenecer a una familia.");
  }

  const familyId = profile.family_id as string;
  const { data: family } = await admin
    .from("families")
    .select("user_1_id, user_2_id")
    .eq("id", familyId)
    .maybeSingle();

  const memberCount = memberCountFromFamilyUsers(
    family?.user_1_id as string | null | undefined,
    family?.user_2_id as string | null | undefined
  );

  return {
    userId: user.id,
    familyId,
    admin,
    memberCount,
    individual: isIndividualHousehold(memberCount),
  };
}

async function getFamilyMemberCount(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  familyId: string
) {
  const { data: family } = await admin
    .from("families")
    .select("user_1_id, user_2_id")
    .eq("id", familyId)
    .maybeSingle();
  return memberCountFromFamilyUsers(
    family?.user_1_id as string | null | undefined,
    family?.user_2_id as string | null | undefined
  );
}

async function seedBasicCategoriesIfEmpty(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  familyId: string,
  userId: string
) {
  const { count } = await admin
    .from("family_categories")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId)
    .is("parent_id", null)
    .is("archived_at", null);

  if ((count ?? 0) > 0) return;

  const individual = isIndividualHousehold(
    await getFamilyMemberCount(admin, familyId)
  );

  const payload = BASIC_SHARED_CATEGORY_SEEDS.map((seed) => ({
    family_id: familyId,
    parent_id: null,
    scope: individual ? ("personal" as const) : ("shared" as const),
    owner_profile_id: individual ? userId : null,
    name: seed.name,
    color: seed.color,
    icon: seed.icon,
    sort_order: seed.sort_order,
  }));

  let { error } = await admin.from("family_categories").insert(payload as never);
  if (error && /icon|column/i.test(error.message)) {
    const withoutIcon = payload.map(({ icon: _i, ...rest }) => rest);
    ({ error } = await admin.from("family_categories").insert(withoutIcon as never));
  }
  if (error && !/duplicate|unique/i.test(error.message)) {
    console.error("[categories] seed", error.message);
  }
}

export async function listFamilyCategoriesAction(): Promise<FamilyCategory[]> {
  const { userId, familyId, admin } = await requireUserAndFamily();

  try {
    await seedBasicCategoriesIfEmpty(admin, familyId, userId);
  } catch (err) {
    console.error("[categories] seed failed", err);
  }

  const { data, error } = await admin
    .from("family_categories")
    .select("*")
    .eq("family_id", familyId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (/family_categories|does not exist|column/i.test(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  return ((data ?? []) as Record<string, unknown>[])
    .map(mapCategoryRow)
    .filter(
      (c) => c.scope === "shared" || c.owner_profile_id === userId
    );
}

export async function createCategoryAction(input: {
  name: string;
  scope: CategoryScope;
  parentId?: string | null;
  color?: string | null;
  icon?: string | null;
}): Promise<FamilyCategory> {
  const { userId, familyId, admin, individual } = await requireUserAndFamily();
  const name = input.name.trim();
  if (!name) throw new Error("Escribe un nombre.");
  if (name.length > 40) throw new Error("El nombre es demasiado largo.");

  let parent: FamilyCategory | null = null;
  if (input.parentId) {
    const { data: parentRow, error: parentError } = await admin
      .from("family_categories")
      .select("*")
      .eq("id", input.parentId)
      .eq("family_id", familyId)
      .is("archived_at", null)
      .maybeSingle();
    if (parentError || !parentRow) {
      throw new Error("No encontramos la categoría padre.");
    }
    parent = mapCategoryRow(parentRow as Record<string, unknown>);
    if (parent.parent_id) {
      throw new Error("No se pueden anidar subcategorías dentro de otra subcategoría.");
    }
    if (parent.scope === "personal" && parent.owner_profile_id !== userId) {
      throw new Error("Solo puedes añadir subcategorías a tus categorías personales.");
    }
  }

  // Individual spaces only use personal categories (same rule as accounts/funds).
  const requestedScope: CategoryScope = individual ? "personal" : input.scope;
  const scope: CategoryScope = parent ? parent.scope : requestedScope;
  if (individual && scope === "shared") {
    throw new Error("En un espacio individual solo puedes crear categorías personales.");
  }
  const owner =
    scope === "personal" ? (parent?.owner_profile_id ?? userId) : null;

  const { count } = await admin
    .from("family_categories")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId)
    .is("archived_at", null);

  const sort_order = 100 + (count ?? 0);

  const payload = {
    family_id: familyId,
    parent_id: parent?.id ?? null,
    scope,
    owner_profile_id: owner,
    name,
    color: input.color?.trim() || parent?.color || null,
    icon: input.icon?.trim() || parent?.icon || "tags",
    sort_order,
  };

  let { data, error } = await admin
    .from("family_categories")
    .insert(payload as never)
    .select("*")
    .single();

  if (error && /icon|column/i.test(error.message)) {
    const { icon: _i, ...withoutIcon } = payload;
    ({ data, error } = await admin
      .from("family_categories")
      .insert(withoutIcon as never)
      .select("*")
      .single());
  }

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      throw new Error("Ya existe una categoría con ese nombre.");
    }
    throw new Error(
      /family_categories|column/i.test(error.message)
        ? "Falta aplicar la migración de categorías."
        : error.message
    );
  }

  revalidatePath("/categories");
  revalidatePath("/budget");
  return mapCategoryRow(data as Record<string, unknown>);
}

export async function renameCategoryAction(input: {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}): Promise<void> {
  const { userId, familyId, admin } = await requireUserAndFamily();
  const name = input.name.trim();
  if (!name) throw new Error("Escribe un nombre.");
  if (name.length > 40) throw new Error("El nombre es demasiado largo.");

  const { data: existing, error: loadError } = await admin
    .from("family_categories")
    .select("*")
    .eq("id", input.id)
    .eq("family_id", familyId)
    .maybeSingle();

  if (loadError || !existing) throw new Error("No encontramos esa categoría.");
  const row = mapCategoryRow(existing as Record<string, unknown>);
  if (row.scope === "personal" && row.owner_profile_id !== userId) {
    throw new Error("No puedes editar la categoría de otra persona.");
  }

  const patch: Record<string, string> = {
    name,
    updated_at: new Date().toISOString(),
  };
  if (input.color !== undefined) {
    patch.color = input.color?.trim() || row.color || "#57534E";
  }
  if (input.icon !== undefined) {
    patch.icon = input.icon?.trim() || row.icon || "tags";
  }

  let { error } = await admin
    .from("family_categories")
    .update(patch as never)
    .eq("id", input.id)
    .eq("family_id", familyId);

  if (error && /icon|column/i.test(error.message)) {
    const { icon: _i, ...withoutIcon } = patch;
    ({ error } = await admin
      .from("family_categories")
      .update(withoutIcon as never)
      .eq("id", input.id)
      .eq("family_id", familyId));
  }

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      throw new Error("Ya existe una categoría con ese nombre.");
    }
    throw new Error(error.message);
  }

  revalidatePath("/categories");
  revalidatePath("/budget");
}

export async function archiveCategoryAction(id: string): Promise<void> {
  const { userId, familyId, admin } = await requireUserAndFamily();

  const { data: existing, error: loadError } = await admin
    .from("family_categories")
    .select("*")
    .eq("id", id)
    .eq("family_id", familyId)
    .maybeSingle();

  if (loadError || !existing) throw new Error("No encontramos esa categoría.");
  const row = mapCategoryRow(existing as Record<string, unknown>);
  if (row.scope === "personal" && row.owner_profile_id !== userId) {
    throw new Error("No puedes archivar la categoría de otra persona.");
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("family_categories")
    .update({ archived_at: now, updated_at: now } as never)
    .eq("family_id", familyId)
    .or(`id.eq.${id},parent_id.eq.${id}`);

  if (error) throw new Error(error.message);

  revalidatePath("/categories");
  revalidatePath("/budget");
}
