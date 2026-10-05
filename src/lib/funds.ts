export type FundScope = "shared" | "personal";

/** Default palette for shared funds (works with white text overlays). */
export const FUND_COLOR_OPTIONS = [
  { id: "sage", label: "Salvia", value: "#4A6549" },
  { id: "teal", label: "Verde mar", value: "#0F766E" },
  { id: "sky", label: "Azul cielo", value: "#0369A1" },
  { id: "indigo", label: "Índigo", value: "#4338CA" },
  { id: "violet", label: "Violeta", value: "#7C3AED" },
  { id: "rose", label: "Rosa", value: "#BE123C" },
  { id: "orange", label: "Naranja", value: "#C2410C" },
  { id: "amber", label: "Ámbar", value: "#B45309" },
] as const;

export const DEFAULT_SHARED_FUND_COLOR = FUND_COLOR_OPTIONS[0].value;
export const DEFAULT_PERSONAL_FUND_COLOR = "#0F2D91";

export type FundColor = (typeof FUND_COLOR_OPTIONS)[number]["value"] | string;

export interface FamilyFund {
  id: string;
  family_id: string;
  name: string;
  scope: FundScope;
  owner_profile_id: string | null;
  is_default: boolean;
  is_system: boolean;
  sort_order: number;
  archived_at: string | null;
  color?: string | null;
}

export function resolveFundColor(fund?: Pick<FamilyFund, "color" | "scope"> | null) {
  if (fund?.color) return fund.color;
  if (fund?.scope === "personal") return DEFAULT_PERSONAL_FUND_COLOR;
  return DEFAULT_SHARED_FUND_COLOR;
}

export function isAllowedFundColor(color: string) {
  return FUND_COLOR_OPTIONS.some((option) => option.value.toLowerCase() === color.toLowerCase());
}

export interface FundExpenseLike {
  amount: number;
  category?: string | null;
  concept?: string | null;
  paid_by: string;
  responsible_for?: string | null;
  fund_id?: string | null;
  paid_from_fund?: boolean | null;
  is_settled?: boolean | null;
  is_active?: boolean | null;
  transfer_group_id?: string | null;
}

const SHARED_LEGACY = new Set(["joint_fund", "fondo_comun", "shared", "compartido"]);

export function isSharedLegacyResponsible(value?: string | null) {
  return SHARED_LEGACY.has(String(value ?? "").trim().toLowerCase());
}

export function resolveFundIdForExpense(
  expense: FundExpenseLike,
  funds: FamilyFund[],
  currentUserId?: string
): string | null {
  if (expense.fund_id) return expense.fund_id;

  if (isSharedLegacyResponsible(expense.responsible_for)) {
    return funds.find((f) => f.scope === "shared" && f.is_default && !f.archived_at)?.id ?? null;
  }

  const responsible = String(expense.responsible_for ?? "").trim();
  if (responsible) {
    const personal = funds.find(
      (f) => f.scope === "personal" && f.owner_profile_id === responsible && !f.archived_at
    );
    if (personal) return personal.id;
  }

  if (currentUserId) {
    return (
      funds.find(
        (f) => f.scope === "personal" && f.owner_profile_id === currentUserId && !f.archived_at
      )?.id ?? null
    );
  }

  return null;
}

/** Cash balance of a pocket (caja). */
export function calculateFundCashBalance(
  expenses: FundExpenseLike[],
  fundId: string,
  options?: { treatLegacyJointAsFundId?: string | null }
): number {
  const legacySharedId = options?.treatLegacyJointAsFundId ?? null;

  const belongs = (e: FundExpenseLike) => {
    if (e.is_active === false) return false;
    if (e.fund_id === fundId) return true;
    if (
      legacySharedId &&
      fundId === legacySharedId &&
      !e.fund_id &&
      isSharedLegacyResponsible(e.responsible_for)
    ) {
      return true;
    }
    return false;
  };

  const rows = expenses.filter(belongs);

  const deposits = rows
    .filter((e) => e.category === "deposit" && !e.transfer_group_id)
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const transferIn = rows
    .filter((e) => e.category === "deposit" && !!e.transfer_group_id)
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const cashOut = rows
    .filter(
      (e) =>
        e.category !== "deposit" &&
        e.category !== "withdrawal" &&
        e.paid_from_fund === true &&
        !e.transfer_group_id
    )
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  // Legacy: paid_by literal joint_fund (if any slipped through)
  const legacyCashOut = rows
    .filter(
      (e) =>
        e.category !== "deposit" &&
        e.category !== "withdrawal" &&
        e.paid_from_fund !== true &&
        e.paid_by === "joint_fund" &&
        !e.transfer_group_id
    )
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const withdrawals = rows
    .filter((e) => e.category === "withdrawal" && !e.transfer_group_id)
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const transferOut = rows
    .filter((e) => e.category === "withdrawal" && !!e.transfer_group_id)
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  return Math.round((deposits + transferIn - cashOut - legacyCashOut - withdrawals - transferOut) * 100) / 100;
}

/** What a shared fund owes the current user (advances not yet settled). */
export function calculateFundOwesUser(
  expenses: FundExpenseLike[],
  fund: FamilyFund,
  userId: string
): number {
  if (fund.scope !== "shared") return 0;

  return (
    Math.round(
      expenses
        .filter((e) => {
          if (e.is_active === false) return false;
          if (e.is_settled) return false;
          if (e.category === "deposit" || e.category === "withdrawal") return false;
          if (e.paid_from_fund) return false;
          if (e.paid_by !== userId) return false;
          if (e.fund_id) return e.fund_id === fund.id;
          return isSharedLegacyResponsible(e.responsible_for) && fund.is_default;
        })
        .reduce((s, e) => s + Number(e.amount || 0), 0) * 100
    ) / 100
  );
}

export function getDefaultSharedFund(funds: FamilyFund[]) {
  return funds.find((f) => f.scope === "shared" && f.is_default && !f.archived_at) ?? null;
}

export function getPersonalFund(funds: FamilyFund[], userId: string) {
  return (
    funds.find(
      (f) => f.scope === "personal" && f.owner_profile_id === userId && !f.archived_at
    ) ?? null
  );
}

export function listActiveFunds(funds: FamilyFund[]) {
  return [...funds]
    .filter((f) => !f.archived_at)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"));
}

export function listVisibleFundsForUser(funds: FamilyFund[], userId: string) {
  return listActiveFunds(funds).filter(
    (f) => f.scope === "shared" || f.owner_profile_id === userId
  );
}
