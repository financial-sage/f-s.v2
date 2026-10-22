import type { StoreExpenseRow } from "@/store/useExpenseStore";

const SKIP_PREFIXES = [
  "liquidación de deuda",
  "aporte a",
  "aporte al",
  "aporte personal",
  "reembolso del fondo",
];

function shouldSkipConcept(concept: string) {
  const lower = concept.toLowerCase();
  return SKIP_PREFIXES.some((p) => lower.startsWith(p));
}

/**
 * Most frequent expense concepts for a pocket (or the whole family if no fundId).
 * Useful to nudge the user when they forget "¿En qué gastaste?".
 */
export function frequentConceptsForFund(
  expenses: StoreExpenseRow[],
  options?: { fundId?: string | null; limit?: number }
): string[] {
  const limit = options?.limit ?? 6;
  const fundId = options?.fundId ?? null;
  const counts = new Map<string, number>();

  for (const expense of expenses) {
    if (!expense.is_active) continue;
    const category = String(expense.category ?? "");
    if (category === "deposit" || category === "withdrawal") continue;
    if (fundId && expense.fund_id !== fundId) continue;

    const concept = String(expense.concept ?? "").trim();
    if (concept.length < 2) continue;
    if (shouldSkipConcept(concept)) continue;

    // Normalize lightly so "Uber" / "uber" collapse.
    const key = concept.replace(/\s+/g, " ");
    const prev = counts.get(key) ?? 0;
    counts.set(key, prev + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .slice(0, limit)
    .map(([concept]) => concept);
}
