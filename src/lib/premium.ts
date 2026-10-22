/** Free-tier caps and household entitlement (Premium v1). */

export const FREE_EXTRA_FUNDS_LIMIT = 1;
export const FREE_ACCOUNTS_LIMIT = 1;
export const FREE_FIXED_EXPENSES_LIMIT = 3;
export const COUPLE_TRIAL_DAYS = 7;
/** Solo free trial for Recommendations (same length as couple trial). */
export const RECOMMENDATIONS_SOLO_TRIAL_DAYS = 7;

export type CoupleMode =
  | "solo"
  | "couple_waiting_partner"
  | "couple_pre_trial"
  | "couple_trial"
  | "couple_paused"
  | "couple_premium";

/** How Recommendations (Premium feature) is unlocked right now. */
export type RecommendationsAccess =
  | "premium"
  | "couple_trial"
  | "solo_trial"
  | "locked";

export type HouseholdEntitlement = {
  familyId: string;
  memberCount: number;
  inviteCode: string | null;
  isPremiumHousehold: boolean;
  premiumUntil: string | null;
  coupleTrialStartedAt: string | null;
  coupleTrialEndsAt: string | null;
  firstMovementAt: string | null;
  firstMovementBy: string | null;
  coupleMode: CoupleMode;
  /** Couple UI (DashboardCouple) should be shown. */
  showCoupleUi: boolean;
  /** Shared / couple writes allowed. */
  canUseCoupleFeatures: boolean;
  /** Free caps on funds/accounts/fixed do not apply. */
  unlimitedQuotas: boolean;
  /** Whole seconds left in trial; null if not in trial. */
  trialSecondsRemaining: number | null;
  /**
   * Recommendations (IA + aviso + /recommendations) — Premium feature.
   * Unlocked by household Premium, couple trial, or solo free trial.
   */
  canUseRecommendations: boolean;
  recommendationsAccess: RecommendationsAccess;
  /** Seconds left in solo/couple trial that unlock Recommendations; null if Premium or locked. */
  recommendationsTrialSecondsRemaining: number | null;
};

export type PremiumSource = "vip" | "stub" | "campaign" | "paid" | "unknown";

export type FamilyBillingRow = {
  id: string;
  user_1_id: string;
  user_2_id: string | null;
  invite_code: string | null;
  couple_trial_started_at: string | null;
  couple_trial_ends_at: string | null;
  is_premium_household: boolean | null;
  premium_until: string | null;
  first_movement_at: string | null;
  first_movement_by: string | null;
  premium_source?: PremiumSource | string | null;
};

export type FirstMoveCelebration = {
  fromUserId: string;
  fromName: string;
  kind: "expense" | "income";
  at: string;
  /** actor = who registered; partner = the other member. */
  role?: "actor" | "partner";
};

export type PremiumWelcomeVariant = "solo" | "couple";

export type PremiumWelcomeCelebration = {
  at: string;
  variant: PremiumWelcomeVariant;
  source?: "paid" | "vip" | "stub" | "campaign" | string;
};

export const PREMIUM_REQUIRED_MESSAGE =
  "Has alcanzado el límite de la versión gratuita. Desbloquea Premium para continuar.";

export const COUPLE_PAUSED_MESSAGE =
  "El modo pareja está en pausa. Activa Premium con el código de familia para seguir compartiendo.";

export const RECOMMENDATIONS_PREMIUM_MESSAGE =
  "Las recomendaciones con IA forman parte de Premium. Activa Premium o usa tu prueba gratis mientras esté disponible.";

function memberCount(row: Pick<FamilyBillingRow, "user_1_id" | "user_2_id">) {
  return row.user_2_id ? 2 : 1;
}

function isPremiumActive(row: FamilyBillingRow, nowMs: number) {
  if (row.is_premium_household) return true;
  if (row.premium_until) {
    const until = Date.parse(row.premium_until);
    if (Number.isFinite(until) && until > nowMs) return true;
  }
  return false;
}

function trialSecondsRemaining(endsAt: string | null, nowMs: number) {
  if (!endsAt) return null;
  const ends = Date.parse(endsAt);
  if (!Number.isFinite(ends)) return null;
  const sec = Math.floor((ends - nowMs) / 1000);
  return sec > 0 ? sec : 0;
}

export function resolveHouseholdEntitlement(
  row: FamilyBillingRow,
  now: Date = new Date()
): HouseholdEntitlement {
  const nowMs = now.getTime();
  const count = memberCount(row);
  const premium = isPremiumActive(row, nowMs);
  const trialEnds = row.couple_trial_ends_at;
  const trialStarted = Boolean(row.couple_trial_started_at);
  const trialSecs = trialSecondsRemaining(trialEnds, nowMs);
  const trialActive = trialStarted && trialSecs != null && trialSecs > 0;
  const trialExpired =
    trialStarted && (trialSecs === 0 || (trialEnds != null && Date.parse(trialEnds) <= nowMs));

  let coupleMode: CoupleMode;
  if (count < 2) {
    coupleMode = "solo";
  } else if (premium) {
    coupleMode = "couple_premium";
  } else if (trialActive) {
    coupleMode = "couple_trial";
  } else if (trialExpired) {
    coupleMode = "couple_paused";
  } else {
    coupleMode = "couple_pre_trial";
  }

  const showCoupleUi =
    coupleMode === "couple_premium" ||
    coupleMode === "couple_trial" ||
    coupleMode === "couple_pre_trial";

  const canUseCoupleFeatures = showCoupleUi;
  const unlimitedQuotas =
    premium || coupleMode === "couple_trial" || coupleMode === "couple_pre_trial";

  // Recommendations = Premium (+ free trial: couple 7d, or solo 7d from first movement).
  let recommendationsAccess: RecommendationsAccess = "locked";
  let recommendationsTrialSecondsRemaining: number | null = null;

  if (premium) {
    recommendationsAccess = "premium";
  } else if (coupleMode === "couple_trial") {
    recommendationsAccess = "couple_trial";
    recommendationsTrialSecondsRemaining = trialSecs;
  } else if (count < 2 && row.first_movement_at) {
    const started = Date.parse(row.first_movement_at);
    if (Number.isFinite(started)) {
      const endsMs =
        started + RECOMMENDATIONS_SOLO_TRIAL_DAYS * 24 * 60 * 60 * 1000;
      const soloSecs = Math.floor((endsMs - nowMs) / 1000);
      if (soloSecs > 0) {
        recommendationsAccess = "solo_trial";
        recommendationsTrialSecondsRemaining = soloSecs;
      }
    }
  }

  return {
    familyId: row.id,
    memberCount: count,
    inviteCode: row.invite_code,
    isPremiumHousehold: premium,
    premiumUntil: row.premium_until,
    coupleTrialStartedAt: row.couple_trial_started_at,
    coupleTrialEndsAt: row.couple_trial_ends_at,
    firstMovementAt: row.first_movement_at,
    firstMovementBy: row.first_movement_by,
    coupleMode,
    showCoupleUi,
    canUseCoupleFeatures,
    unlimitedQuotas,
    trialSecondsRemaining: coupleMode === "couple_trial" ? trialSecs : null,
    canUseRecommendations: recommendationsAccess !== "locked",
    recommendationsAccess,
    recommendationsTrialSecondsRemaining,
  };
}

export function parseFirstMoveCelebration(
  raw: unknown
): FirstMoveCelebration | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.fromUserId !== "string" ||
    typeof o.fromName !== "string" ||
    (o.kind !== "expense" && o.kind !== "income") ||
    typeof o.at !== "string"
  ) {
    return null;
  }
  return {
    fromUserId: o.fromUserId,
    fromName: o.fromName,
    kind: o.kind,
    at: o.at,
    role: o.role === "actor" || o.role === "partner" ? o.role : "partner",
  };
}

export function formatTrialDaysLeft(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const days = Math.ceil(seconds / 86400);
  if (days <= 1) {
    const hours = Math.ceil(seconds / 3600);
    if (hours <= 1) return "Menos de 1 hora de prueba";
    return `${hours} h de prueba`;
  }
  return `${days} días de prueba`;
}

/** Short header chip: "7 días Premium" / "Último día Premium". */
export function formatPremiumTrialChip(seconds: number | null): string | null {
  if (seconds == null || seconds <= 0) return null;
  const days = Math.ceil(seconds / 86400);
  if (days <= 1) return "Último día Premium";
  return `${days} días Premium`;
}

export function parsePremiumWelcomeCelebration(
  raw: unknown
): PremiumWelcomeCelebration | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.at !== "string") return null;
  if (o.variant !== "solo" && o.variant !== "couple") return null;
  return {
    at: o.at,
    variant: o.variant,
    source: typeof o.source === "string" ? o.source : undefined,
  };
}
