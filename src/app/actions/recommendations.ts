"use server";

import { revalidatePath } from "next/cache";
import { isSuperAdminUser } from "@/lib/admin";
import { getHomePageData } from "@/lib/dashboard";
import { recommendationContextFromHome } from "@/lib/recommendations/from-home";
import {
  forceDraftOpenRecommendationsWithGemini,
  syncRecommendationsForFamily,
  updateRecommendationStatus,
} from "@/lib/recommendations/sync";
import type { ForceGeminiDraftResult } from "@/lib/recommendations/types";

async function requireFamily() {
  const home = await getHomePageData();
  if (!home.ok) {
    return { ok: false as const, reason: home.reason };
  }
  return { ok: true as const, home: home.data };
}

export async function syncMyRecommendationsAction() {
  const gate = await requireFamily();
  if (!gate.ok) return { ok: false as const, error: gate.reason };

  const ctx = recommendationContextFromHome(gate.home);
  const rows = await syncRecommendationsForFamily(gate.home.familyId, ctx);
  revalidatePath("/recommendations");
  return { ok: true as const, count: rows.length };
}

/** Superadmin only: force Gemini rewrite and return per-rule diagnostics. */
export async function forceGeminiRecommendationsAction(): Promise<
  | { ok: true; result: ForceGeminiDraftResult }
  | { ok: false; error: string; result?: ForceGeminiDraftResult }
> {
  const gate = await requireFamily();
  if (!gate.ok) return { ok: false, error: gate.reason };

  const allowed = await isSuperAdminUser({
    userId: gate.home.userId,
    email: gate.home.userEmail,
  });
  if (!allowed) {
    return { ok: false, error: "Solo superadmin" };
  }

  const ctx = recommendationContextFromHome(gate.home);
  const result = await forceDraftOpenRecommendationsWithGemini(
    gate.home.familyId,
    ctx
  );
  revalidatePath("/recommendations");
  revalidatePath("/");

  if (!result.ok || result.failed > 0) {
    return {
      ok: false,
      error: result.message ?? "Falló la regeneración con IA",
      result,
    };
  }

  return { ok: true, result };
}

export async function markRecommendationSeenAction(id: string) {
  const gate = await requireFamily();
  if (!gate.ok) return { ok: false as const, error: gate.reason };
  const result = await updateRecommendationStatus(
    id,
    gate.home.familyId,
    "seen"
  );
  revalidatePath("/recommendations");
  revalidatePath("/");
  return result;
}

export async function acceptRecommendationAction(id: string) {
  const gate = await requireFamily();
  if (!gate.ok) return { ok: false as const, error: gate.reason };
  const result = await updateRecommendationStatus(
    id,
    gate.home.familyId,
    "accepted"
  );
  revalidatePath("/recommendations");
  revalidatePath("/");
  return result;
}

export async function deferRecommendationAction(id: string) {
  const gate = await requireFamily();
  if (!gate.ok) return { ok: false as const, error: gate.reason };
  const result = await updateRecommendationStatus(
    id,
    gate.home.familyId,
    "deferred"
  );
  revalidatePath("/recommendations");
  revalidatePath("/");
  return result;
}

export async function dismissRecommendationAction(id: string) {
  const gate = await requireFamily();
  if (!gate.ok) return { ok: false as const, error: gate.reason };
  const result = await updateRecommendationStatus(
    id,
    gate.home.familyId,
    "dismissed"
  );
  revalidatePath("/recommendations");
  revalidatePath("/");
  return result;
}
