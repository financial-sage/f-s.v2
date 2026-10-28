import { NextResponse } from "next/server";
import { isSuperAdminUser } from "@/lib/admin";
import { getHomePageData } from "@/lib/dashboard";
import { recommendationContextFromHome } from "@/lib/recommendations/from-home";
import {
  listActiveRecommendations,
  syncRecommendationsForFamily,
} from "@/lib/recommendations/sync";
import { pickPrimaryRecommendation } from "@/lib/recommendations/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const home = await getHomePageData();
  if (!home.ok) {
    return NextResponse.json(
      { count: 0, locked: true, familyId: null, primary: null },
      { status: 200 }
    );
  }

  const isSuperAdmin = await isSuperAdminUser({
    userId: home.data.userId,
    email: home.data.userEmail,
  });
  const canUse =
    Boolean(home.data.entitlement?.canUseRecommendations) || isSuperAdmin;

  if (!canUse) {
    return NextResponse.json(
      {
        count: 0,
        locked: true,
        familyId: home.data.familyId,
        primary: null,
      },
      { status: 200 }
    );
  }

  // Templates only here to avoid burning LLM quota on every home poll.
  const ctx = recommendationContextFromHome(home.data);
  await syncRecommendationsForFamily(home.data.familyId, ctx, {
    preferTemplate: true,
  });
  const rows = await listActiveRecommendations(home.data.familyId);
  const primaryRow = pickPrimaryRecommendation(rows);
  const primary = primaryRow
    ? {
        id: primaryRow.id,
        title: primaryRow.title,
        body: primaryRow.body,
        why: primaryRow.why,
        impact: primaryRow.impact,
        kind: primaryRow.kind,
        priority: primaryRow.priority,
        cta_href: primaryRow.cta_href,
        cta_label: primaryRow.cta_label,
        status: primaryRow.status,
      }
    : null;

  return NextResponse.json({
    count: rows.length,
    locked: false,
    familyId: home.data.familyId,
    primary,
  });
}
