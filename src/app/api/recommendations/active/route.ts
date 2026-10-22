import { NextResponse } from "next/server";
import { getHomePageData } from "@/lib/dashboard";
import { recommendationContextFromHome } from "@/lib/recommendations/from-home";
import {
  countActiveRecommendations,
  syncRecommendationsForFamily,
} from "@/lib/recommendations/sync";

export const dynamic = "force-dynamic";

export async function GET() {
  const home = await getHomePageData();
  if (!home.ok) {
    return NextResponse.json({ count: 0 }, { status: 200 });
  }

  // Ensure candidates exist so the soft notice can appear without visiting the page.
  // Templates only here to avoid burning Gemini quota on every home poll.
  const ctx = recommendationContextFromHome(home.data);
  await syncRecommendationsForFamily(home.data.familyId, ctx, {
    preferTemplate: true,
  });
  const count = await countActiveRecommendations(home.data.familyId);
  return NextResponse.json({ count });
}
