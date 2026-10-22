import { draftCopyWithLlm, isLlmConfigured } from "./llm";
import type { RecommendationSpeech } from "./locale";
import { templateCopyForCandidate } from "./templates";
import type { RecommendationCandidate, RecommendationCopy } from "./types";

export async function renderRecommendationCopy(
  candidate: RecommendationCandidate,
  speech?: RecommendationSpeech
): Promise<RecommendationCopy> {
  if (isLlmConfigured()) {
    const drafted = await draftCopyWithLlm(candidate, speech);
    if (drafted.ok) return drafted.copy;
  }
  return templateCopyForCandidate(candidate);
}
