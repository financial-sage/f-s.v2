export type FundScope = "shared" | "personal";
export type FundPurpose = "general" | "fixed_expenses" | "savings";

export const FIXED_EXPENSES_FUND_NAME = "Gastos fijos";
/** Blue-gray accent for the fixed-expenses fund and screen. */
export const FIXED_EXPENSES_FUND_COLOR = "#5B7188";

export const SAVINGS_FUND_NAME = "Ahorro";
/** Teal accent for the family savings pot and /savings screen. */
export const SAVINGS_FUND_COLOR = "#0F766E";

/** Default palette for shared funds (works with white text overlays). */
export const FUND_COLOR_OPTIONS = [
  { id: "sage", label: "Salvia", value: "#4A6549" },
  { id: "moss", label: "Musgo", value: "#3F6212" },
  { id: "forest", label: "Bosque", value: "#166534" },
  { id: "emerald", label: "Esmeralda", value: "#047857" },
  { id: "teal", label: "Verde mar", value: "#0F766E" },
  { id: "seafoam", label: "Espuma", value: "#115E59" },
  { id: "cyan", label: "Cian", value: "#0E7490" },
  { id: "sky", label: "Azul cielo", value: "#0369A1" },
  { id: "azure", label: "Azur", value: "#1D4ED8" },
  { id: "navy", label: "Navy", value: "#1E3A8A" },
  { id: "blueberry", label: "Arándano", value: "#312E81" },
  { id: "indigo", label: "Índigo", value: "#4338CA" },
  { id: "violet", label: "Violeta", value: "#7C3AED" },
  { id: "plum", label: "Ciruela", value: "#6B21A8" },
  { id: "fuchsia", label: "Fucsia", value: "#A21CAF" },
  { id: "magenta", label: "Magenta", value: "#9D174D" },
  { id: "rose", label: "Rosa", value: "#BE123C" },
  { id: "crimson", label: "Carmesí", value: "#9F1239" },
  { id: "wine", label: "Vino", value: "#7F1D1D" },
  { id: "terracotta", label: "Terracota", value: "#9A3412" },
  { id: "coral", label: "Coral", value: "#C2410C" },
  { id: "orange", label: "Naranja", value: "#EA580C" },
  { id: "amber", label: "Ámbar", value: "#B45309" },
  /** Brand gold — matches `--accent` / logo. */
  { id: "gold", label: "Dorado", value: "#C4A574" },
  { id: "amber-deep", label: "Oro oscuro", value: "#A16207" },
  { id: "copper", label: "Cobre", value: "#92400E" },
  { id: "brown", label: "Café", value: "#78350F" },
  { id: "taupe", label: "Topo", value: "#78716C" },
  { id: "stone", label: "Piedra", value: "#57534E" },
  { id: "slate", label: "Pizarra", value: "#475569" },
  { id: "steel", label: "Acero", value: "#334155" },
  { id: "graphite", label: "Grafito", value: "#2B3437" },
] as const;

export const DEFAULT_SHARED_FUND_COLOR = FUND_COLOR_OPTIONS[0].value;
/** Muted gold from the brand logo (`--accent`). */
export const DEFAULT_PERSONAL_FUND_COLOR = "#C4A574";
/** Navy used for “Mi bolsillo” / personal default in light mode UI. */
export const PERSONAL_FUND_COLOR_LIGHT = "#1E3A8A";
/** Previous personal default; remapped so existing rows pick up the brand gold. */
export const LEGACY_PERSONAL_FUND_COLOR = "#0F2D91";

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
  purpose?: FundPurpose | null;
  /** Superadmin grocery trial: pocket used for market / supermarket purchases. */
  is_grocery?: boolean | null;
}

export function resolveFundColor(fund?: Pick<FamilyFund, "color" | "scope"> | null) {
  if (fund?.scope === "personal") {
    const stored = fund.color?.trim();
    if (
      !stored ||
      stored.toLowerCase() === LEGACY_PERSONAL_FUND_COLOR.toLowerCase()
    ) {
      return DEFAULT_PERSONAL_FUND_COLOR;
    }
    return stored;
  }
  if (fund?.color) return fund.color;
  return DEFAULT_SHARED_FUND_COLOR;
}

/**
 * UI color for chips / hero tint. Personal default gold stays gold in dark mode;
 * in light mode it renders as navy for contrast on cream surfaces.
 */
export function resolveFundUiColor(
  fund: Pick<FamilyFund, "color" | "scope"> | null | undefined,
  isDark: boolean
) {
  const color = resolveFundColor(fund);
  if (
    !isDark &&
    fund?.scope === "personal" &&
    color.toLowerCase() === DEFAULT_PERSONAL_FUND_COLOR.toLowerCase()
  ) {
    return PERSONAL_FUND_COLOR_LIGHT;
  }
  return color;
}

/**
 * Sets `--icon-chip-accent` for `.icon-chip-fund` (light tint / dark coin via CSS).
 */
export function fundIconChipStyle(color: string) {
  return { ["--icon-chip-accent" as string]: color };
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
  account_id?: string | null;
  paid_from_account?: boolean | null;
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

/**
 * Whether an expense reduced the user's personal pocket cash.
 * Excludes cash drawn from shared/system pockets (e.g. Gastos fijos),
 * even if `paid_by` is the user (who only confirmed the payment).
 */
export function isPersonalPocketCashOut(
  expense: Pick<
    FundExpenseLike,
    "paid_by" | "category" | "paid_from_fund" | "responsible_for" | "fund_id"
  > & { paidBy?: string | null },
  userId: string,
  sharedFundIds?: ReadonlySet<string> | readonly string[]
): boolean {
  const paidBy = expense.paid_by ?? expense.paidBy ?? "";
  if (paidBy !== userId) return false;
  if (expense.category === "deposit" || expense.category === "withdrawal") return false;
  // Always charged to the fixed-expenses shared pocket.
  if (expense.category === "fixed_expense") return false;

  if (expense.paid_from_fund === true) {
    const shared =
      sharedFundIds instanceof Set
        ? sharedFundIds
        : sharedFundIds
          ? new Set(sharedFundIds)
          : null;

    if (shared && expense.fund_id && shared.has(expense.fund_id)) {
      return false;
    }
    if (isSharedLegacyResponsible(expense.responsible_for)) {
      return false;
    }
  }

  return true;
}

/** Same rules as Zustand `myAvailableFund`: personal deposits − paid spends − withdrawals. */
export function calculatePersonalPocketBalance(
  expenses: Array<{
    amount: number;
    paid_by: string;
    category?: string | null;
    responsible_for?: string | null;
    paid_from_fund?: boolean | null;
    fund_id?: string | null;
    account_id?: string | null;
    transfer_group_id?: string | null;
  }>,
  userId: string,
  sharedFundIds?: ReadonlySet<string> | readonly string[]
) {
  // Any row with account_id belongs to account cash, not "Mi fondo".
  const fundRows = expenses.filter((e) => !e.account_id);

  // Only personal deposits / reembolsos. Shared-fund withdrawals ("Liquidación de deuda")
  // must not count: settleFundDebt already credits via the matching deposit.
  const income = fundRows
    .filter(
      (e) =>
        e.category === "deposit" &&
        (e.responsible_for === userId || e.responsible_for === "mio")
    )
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const out = fundRows
    .filter((e) => isPersonalPocketCashOut(e, userId, sharedFundIds))
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  // Cash leaving the personal pocket (manual withdrawal or transfer to another fund).
  // Shared-fund withdrawals use responsible_for = joint_fund and are excluded here.
  const withdrawals = fundRows
    .filter(
      (e) =>
        e.category === "withdrawal" &&
        (e.responsible_for === userId || e.responsible_for === "mio")
    )
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  return Math.round((income - out - withdrawals) * 100) / 100;
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
    // Account-only cash must never inflate a bolsillo (ADR-0006).
    if (e.account_id && !e.fund_id) return false;
    if (e.fund_id === fundId) return true;
    if (
      legacySharedId &&
      fundId === legacySharedId &&
      !e.fund_id &&
      !e.account_id &&
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

export function isFixedExpensesFund(fund?: Pick<FamilyFund, "purpose" | "name"> | null) {
  if (!fund) return false;
  if (fund.purpose === "fixed_expenses") return true;
  return fund.name.trim().toLowerCase() === FIXED_EXPENSES_FUND_NAME.toLowerCase();
}

export function isSavingsFund(fund?: Pick<FamilyFund, "purpose" | "name"> | null) {
  if (!fund) return false;
  if (fund.purpose === "savings") return true;
  return fund.name.trim().toLowerCase() === SAVINGS_FUND_NAME.toLowerCase();
}

/** Spending pockets only (excludes system savings pot). */
export function isSpendingFund(fund?: Pick<FamilyFund, "purpose" | "name"> | null) {
  return Boolean(fund) && !isSavingsFund(fund);
}

export function getFixedExpensesFund(funds: FamilyFund[]) {
  return funds.find((f) => !f.archived_at && isFixedExpensesFund(f)) ?? null;
}

export function getSavingsFund(funds: FamilyFund[]) {
  return funds.find((f) => !f.archived_at && isSavingsFund(f)) ?? null;
}

export function listVariableSharedFunds(funds: FamilyFund[]) {
  return listActiveFunds(funds).filter(
    (f) => f.scope === "shared" && !isFixedExpensesFund(f) && !isSavingsFund(f)
  );
}

/** Shared spending funds on the dashboard (includes Gastos fijos; excludes Ahorro). */
export function listDashboardSharedFunds(funds: FamilyFund[]) {
  return listActiveFunds(funds).filter((f) => f.scope === "shared" && !isSavingsFund(f));
}

export function getDefaultSharedFund(funds: FamilyFund[]) {
  return (
    funds.find(
      (f) =>
        f.scope === "shared" &&
        f.is_default &&
        !f.archived_at &&
        !isFixedExpensesFund(f) &&
        !isSavingsFund(f)
    ) ?? null
  );
}

/**
 * The one spending pocket starred as default for this member
 * (shared family default, or their personal default — exclusive).
 */
export function getFavoriteSpendingFund(funds: FamilyFund[], userId: string) {
  const sharedFavorite = getDefaultSharedFund(funds);
  if (sharedFavorite) return sharedFavorite;
  return listPersonalFunds(funds, userId).find((f) => f.is_default) ?? null;
}

/** Fund to show on the couple dashboard hero after mount / soft navigation. */
export function pickDashboardSelectedFundId(
  funds: FamilyFund[],
  userId: string,
  sharedDefaultFundId?: string | null
) {
  const favorite = getFavoriteSpendingFund(funds, userId);
  if (favorite) return favorite.id;

  const shared = listDashboardSharedFunds(funds);
  if (sharedDefaultFundId && shared.some((f) => f.id === sharedDefaultFundId)) {
    return sharedDefaultFundId;
  }

  const firstSharedSpending =
    shared.find((f) => !isFixedExpensesFund(f) && !isSavingsFund(f)) ?? shared[0] ?? null;
  return firstSharedSpending?.id ?? getPersonalFund(funds, userId)?.id ?? null;
}

export function getPersonalFund(funds: FamilyFund[], userId: string) {
  const personal = listPersonalFunds(funds, userId);
  return personal.find((f) => f.is_default) ?? personal[0] ?? null;
}

/**
 * UI label for a personal pocket. System / default rows were stored as "Mi fondo";
 * product copy is always "Mi bolsillo".
 */
export function personalFundDisplayName(
  fund?: Pick<FamilyFund, "id" | "name" | "scope" | "is_default" | "is_system"> | null,
  options?: { primaryId?: string | null }
) {
  if (!fund) return "Mi bolsillo";
  if (fund.scope !== "personal") return fund.name;
  const legacy = fund.name.trim().toLowerCase();
  if (
    fund.is_default ||
    fund.is_system ||
    (options?.primaryId != null && fund.id === options.primaryId) ||
    legacy === "mi fondo" ||
    legacy === "mi bolsillo"
  ) {
    return "Mi bolsillo";
  }
  return fund.name;
}

/** Active personal spending pockets for a member (excludes savings / archived). */
export function listPersonalFunds(funds: FamilyFund[], userId: string) {
  return listActiveFunds(funds).filter(
    (f) =>
      f.scope === "personal" &&
      f.owner_profile_id === userId &&
      !isSavingsFund(f)
  );
}

/**
 * Dashboard pockets for an individual household: personal funds only.
 * Shared system funds (Fondo común, Gastos fijos, Ahorro) stay in the DB
 * but are not offered as selectable spending pockets in solo UX.
 */
export function listSoloDashboardFunds(funds: FamilyFund[], userId: string) {
  return listPersonalFunds(funds, userId);
}

/** System pots that individual households may still use (Ahorro, Gastos fijos). */
export function isIndividualSharedSystemFund(
  fund?: Pick<FamilyFund, "purpose" | "name"> | null
) {
  return isSavingsFund(fund) || isFixedExpensesFund(fund);
}

/**
 * Bolsillos seleccionables en transferencias cuenta ↔ bolsillo.
 * Individual: personales + Ahorro + Gastos fijos (nunca Fondo común).
 * Pareja: compartidos operables + personales propios (incluye Ahorro / Gastos fijos).
 */
export function listAccountTransferFunds(
  funds: FamilyFund[],
  userId: string,
  options?: { individual?: boolean }
) {
  const active = listActiveFunds(funds);
  if (options?.individual) {
    return active.filter(
      (f) =>
        isIndividualSharedSystemFund(f) ||
        (f.scope === "personal" && f.owner_profile_id === userId)
    );
  }
  return active.filter(
    (f) => f.scope === "shared" || f.owner_profile_id === userId
  );
}

/**
 * Balance of a personal pocket for solo UX.
 * Fund-tagged rows use caja; untagged legacy personal rows count on the default pocket.
 */
export function calculateSoloPersonalFundBalance(
  expenses: FundExpenseLike[],
  fund: FamilyFund,
  userId: string,
  defaultPersonalFundId: string | null
): number {
  const tagged = calculateFundCashBalance(expenses, fund.id);
  if (!defaultPersonalFundId || fund.id !== defaultPersonalFundId) {
    return tagged;
  }

  const untagged = expenses.filter(
    (e) =>
      e.is_active !== false &&
      !e.account_id &&
      !e.fund_id &&
      (e.responsible_for === userId ||
        e.responsible_for === "mio" ||
        e.paid_by === userId)
  );

  const income = untagged
    .filter(
      (e) =>
        e.category === "deposit" &&
        (e.responsible_for === userId || e.responsible_for === "mio")
    )
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const out = untagged
    .filter((e) => isPersonalPocketCashOut(e, userId))
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const withdrawals = untagged
    .filter(
      (e) =>
        e.category === "withdrawal" &&
        (e.responsible_for === userId || e.responsible_for === "mio")
    )
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  return Math.round((tagged + income - out - withdrawals) * 100) / 100;
}

export function listActiveFunds(funds: FamilyFund[]) {
  return [...funds]
    .filter((f) => !f.archived_at)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"));
}

export function listVisibleFundsForUser(funds: FamilyFund[], userId: string) {
  return listActiveFunds(funds).filter(
    (f) =>
      !isSavingsFund(f) &&
      (f.scope === "shared" || f.owner_profile_id === userId)
  );
}
