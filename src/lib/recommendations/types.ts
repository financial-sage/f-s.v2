export type RecommendationStatus =
  | "new"
  | "seen"
  | "accepted"
  | "deferred"
  | "dismissed"
  | "resolved";

export type RecommendationPriority =
  | "critical"
  | "important"
  | "opportunity"
  | "educational";

export type RecommendationCopySource = "template" | "gemini";

export type RecommendationRuleId =
  | "account_strained"
  | "suggest_savings"
  | "review_spend_pace"
  | "organize_accounts";

export interface RecommendationFacts {
  [key: string]: string | number | boolean | null | undefined;
}

export interface RecommendationCandidate {
  ruleId: RecommendationRuleId;
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
  pockets: { name: string; balance: number }[];
  negativePocketCount: number;
  hasSavingsFund: boolean;
  savingsBalance: number;
  fundsCount: number;
  memberCount: number;
  isCoupleUi: boolean;
}

/** Superadmin force-Gemini diagnostics (safe to show in client modal). */
export type ForceGeminiDraftItem = {
  ruleId: string;
  ok: boolean;
  error?: string;
};

export type ForceGeminiDraftResult = {
  ok: boolean;
  geminiConfigured: boolean;
  model: string;
  items: ForceGeminiDraftItem[];
  upgraded: number;
  failed: number;
  message?: string;
};
