import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { suggestCategoryForConcept } from "@/lib/categories/suggest";

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

  const result = await suggestCategoryForConcept({ concept, fundName });
  return NextResponse.json(result);
}
