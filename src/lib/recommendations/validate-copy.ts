import type { RecommendationCopy, RecommendationFacts } from "./types";

function parseEuNumber(raw: string): number {
  const t = raw.trim();
  if (t.includes(",") && t.includes(".")) {
    return Number(t.replace(/\./g, "").replace(",", "."));
  }
  if (t.includes(",")) return Number(t.replace(",", "."));
  return Number(t);
}

function factMoneyValues(facts: RecommendationFacts): Set<number> {
  const set = new Set<number>();
  for (const value of Object.values(facts)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      const rounded = Math.round(value * 100) / 100;
      set.add(rounded);
      set.add(Math.round(value));
    }
  }
  return set;
}

/**
 * Soft check: only amounts written with € must match facts.
 * Counts in prose ("2 bolsillos") are allowed.
 */
export function copyRespectsFacts(
  copy: Omit<RecommendationCopy, "source">,
  facts: RecommendationFacts
): boolean {
  const allowed = factMoneyValues(facts);
  const blob = [copy.title, copy.body, copy.impact ?? "", ...(copy.why ?? [])].join(
    " "
  );

  for (const match of blob.matchAll(/(-?\d+(?:[.,]\d+)?)\s*€/g)) {
    const value = parseEuNumber(match[1]);
    if (!Number.isFinite(value)) continue;
    const rounded = Math.round(value * 100) / 100;
    if (!allowed.has(rounded) && !allowed.has(Math.round(rounded))) {
      return false;
    }
  }
  return true;
}
