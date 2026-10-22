import { draftCopyWithGemini, isGeminiConfigured } from "./gemini";
import type { RecommendationSpeech } from "./locale";
import { templateCopyForCandidate } from "./templates";
import type { RecommendationCandidate, RecommendationCopy } from "./types";

export async function renderRecommendationCopy(
  candidate: RecommendationCandidate,
  speech?: RecommendationSpeech
): Promise<RecommendationCopy> {
  if (isGeminiConfigured()) {
    const drafted = await draftCopyWithGemini(candidate, speech);
    if (drafted.ok) return drafted.copy;
  }
  return templateCopyForCandidate(candidate);
}
