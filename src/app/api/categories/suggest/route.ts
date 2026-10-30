import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { suggestCategoryForConcept } from "@/lib/categories/suggest";
import { mapCategoryRow } from "@/lib/familyCategories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { concept?: string; fundName?: string | null } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const concept = String(body.concept ?? "").trim();
  const fundName =
    typeof body.fundName === "string" ? body.fundName : body.fundName ?? null;

  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();
  const familyId = (profile as { family_id?: string } | null)?.family_id;
  if (!familyId) {
    return NextResponse.json({ categoryId: null, source: "default" });
  }

  const { data: rows } = await admin
    .from("family_categories")
    .select("*")
    .eq("family_id", familyId)
    .is("archived_at", null);

  const categories = ((rows ?? []) as Record<string, unknown>[])
    .map(mapCategoryRow)
    .filter(
      (c) => c.scope === "shared" || c.owner_profile_id === user.id
    )
    .map((c) => ({
      id: c.id,
      name: c.name,
      parent_id: c.parent_id,
      icon: c.icon,
    }));

  const result = await suggestCategoryForConcept({
    concept,
    fundName,
    categories,
  });
  return NextResponse.json(result);
}
