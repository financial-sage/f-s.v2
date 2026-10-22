"use server";

import { revalidatePath } from "next/cache";
import { getHomePageData } from "@/lib/dashboard";
import { recommendationContextFromHome } from "@/lib/recommendations/from-home";
import {
  syncRecommendationsForFamily,
  updateRecommendationStatus,
} from "@/lib/recommendations/sync";

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
