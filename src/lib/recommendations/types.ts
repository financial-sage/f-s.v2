export type RecommendationStatus =
  | "new"
  | "seen"
  | "accepted"
  | "deferred"
  | "dismissed"
  | "resolved";

/** Marked in `facts` when the user removes a note from Activas/Anteriores. */
export const RECOMMENDATION_PERMANENTLY_DELETED_FACT = "permanently_deleted";

export type RecommendationPriority =
  | "critical"
  | "important"
  | "opportunity"
  | "educational";

/** CFO note kinds (ADR-0011). */
export type RecommendationKind =
  | "recommendation"
  | "alert"
  | "summary"
  | "nudge"
  | "celebration";

/** `gemini` kept for rows drafted before the OpenAI switch. */
export type RecommendationCopySource = "template" | "openai" | "gemini";

export type RecommendationRuleId =
  | "welcome_panel"
  | "account_strained"
  | "suggest_savings"
  | "review_spend_pace"
  | "organize_accounts"
  | "spend_pace_nudge"
  | "savings_milestone"
  | "month_pulse_summary";

export interface RecommendationFacts {
  [key: string]: string | number | boolean | null | undefined;
}

export interface RecommendationCandidate {
  ruleId: RecommendationRuleId;
  kind: RecommendationKind;
  priority: RecommendationPriority;
  facts: RecommendationFacts;
  ctaHref: string | null;
  ctaLabel: string | null;
}

export interface RecommendationCopy {
  title: string;
  body: string;
  why: string[];
  impact: string | null;
  source: RecommendationCopySource;
}

export interface RecommendationRecord {
  id: string;
  family_id: string;
  member_id: string | null;
  rule_id: string;
  kind: RecommendationKind;
  priority: RecommendationPriority;
  status: RecommendationStatus;
  facts: RecommendationFacts;
  title: string;
  body: string;
  why: string[];
  impact: string | null;
  cta_href: string | null;
  cta_label: string | null;
  defer_until: string | null;
  copy_source: RecommendationCopySource;
  created_at: string;
  updated_at: string;
}

export interface RecommendationContext {
  hasVisibleAccounts: boolean;
  accountsVisibleLiquidity: number;
  pocketOrHeroBalance: number;
  monthSpent: number;
  /** Ledger rows visible to the user (expenses + deposits + transfers). */
  ledgerMovementCount: number;
  pockets: { name: string; balance: number }[];
  negativePocketCount: number;
  hasSavingsFund: boolean;
  savingsBalance: number;
  fundsCount: number;
  memberCount: number;
  isCoupleUi: boolean;
}

/** Superadmin force-LLM diagnostics (safe to show in client modal). */
export type ForceGeminiDraftItem = {
  ruleId: string;
  ok: boolean;
  error?: string;
};

export type ForceGeminiDraftResult = {
  ok: boolean;
  /** OpenAI key present on the server. */
  geminiConfigured: boolean;
  model: string;
  items: ForceGeminiDraftItem[];
  upgraded: number;
  failed: number;
  message?: string;
};

export type ForceLlmDraftItem = ForceGeminiDraftItem;
export type ForceLlmDraftResult = ForceGeminiDraftResult;

export const KIND_LABEL: Record<RecommendationKind, string> = {
  recommendation: "Sugerencia",
  alert: "Aviso",
  summary: "Resumen",
  nudge: "Empujón",
  celebration: "Logro",
};

export const PRIORITY_RANK: Record<RecommendationPriority, number> = {
  critical: 0,
  important: 1,
  opportunity: 2,
  educational: 3,
};

export function pickPrimaryRecommendation(
  rows: RecommendationRecord[]
): RecommendationRecord | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  })[0];
}
