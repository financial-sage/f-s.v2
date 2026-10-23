export type AccountScope = "personal" | "shared";
export type AccountVisibility = "private" | "family_visible";
export type AccountKind = "checking" | "credit" | "investment";

export const ACCOUNT_KINDS: AccountKind[] = ["checking", "credit", "investment"];

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  checking: "Cuenta bancaria",
  credit: "Tarjeta de crédito",
  investment: "Inversión",
};

export const ACCOUNT_KIND_HINTS: Record<AccountKind, string> = {
  checking: "Dónde vive el dinero líquido",
  credit: "Lo que debes en la tarjeta",
  investment: "Valor actual (fondo, depósito a plazo…)",
};

/** Soft palette for accounts (distinct from fund greens). */
export const ACCOUNT_COLOR_OPTIONS = [
  { id: "slate", label: "Pizarra", value: "#475569" },
  { id: "navy", label: "Navy", value: "#1E3A8A" },
  { id: "sky", label: "Azul cielo", value: "#0369A1" },
  { id: "teal", label: "Verde mar", value: "#0F766E" },
  { id: "stone", label: "Piedra", value: "#57534E" },
  { id: "indigo", label: "Índigo", value: "#4338CA" },
  { id: "violet", label: "Violeta", value: "#7C3AED" },
  { id: "rose", label: "Rosa", value: "#BE123C" },
  { id: "coral", label: "Coral", value: "#C2410C" },
  { id: "amber", label: "Ámbar", value: "#B45309" },
] as const;

export const DEFAULT_SHARED_ACCOUNT_COLOR = ACCOUNT_COLOR_OPTIONS[0].value;
export const DEFAULT_PERSONAL_ACCOUNT_COLOR = ACCOUNT_COLOR_OPTIONS[1].value;

/** Seeded personal cash account — editable and archivable (not system-locked). */
export const DEFAULT_CASH_ACCOUNT_NAME = "Efectivo";
/** Stone — distinct from navy bank accounts. */
export const DEFAULT_CASH_ACCOUNT_COLOR = ACCOUNT_COLOR_OPTIONS[4].value;

export function isDefaultCashAccountName(name: string) {
  return name.trim().toLowerCase() === DEFAULT_CASH_ACCOUNT_NAME.toLowerCase();
}

export interface FamilyAccount {
  id: string;
  family_id: string;
  name: string;
  scope: AccountScope;
  owner_profile_id: string | null;
  visibility: AccountVisibility;
  kind?: AccountKind | null;
  color?: string | null;
  sort_order: number;
  archived_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export function normalizeAccountKind(value: unknown): AccountKind {
  if (value === "credit" || value === "investment" || value === "checking") return value;
  return "checking";
}

export function accountKindOf(account?: Pick<FamilyAccount, "kind"> | null): AccountKind {
  return normalizeAccountKind(account?.kind);
}

export function isLiquidityAccount(account?: Pick<FamilyAccount, "kind"> | null) {
  return accountKindOf(account) === "checking";
}

export function isCreditAccount(account?: Pick<FamilyAccount, "kind"> | null) {
  return accountKindOf(account) === "credit";
}

export function isInvestmentAccount(account?: Pick<FamilyAccount, "kind"> | null) {
  return accountKindOf(account) === "investment";
}

/** Debt owed on a credit account (≥ 0). Ledger balance is typically negative. */
export function creditDebtFromBalance(rawBalance: number): number {
  const n = Number(rawBalance) || 0;
  return Math.round(Math.max(0, -n) * 100) / 100;
}

/** Amount shown in lists: debt for credit, raw balance otherwise. */
export function displayAccountAmount(
  account: Pick<FamilyAccount, "kind"> | null | undefined,
  rawBalance: number
): number {
  if (isCreditAccount(account)) return creditDebtFromBalance(rawBalance);
  return Math.round((Number(rawBalance) || 0) * 100) / 100;
}

export function sumVisibleLiquidity(
  rows: Array<{ account: Pick<FamilyAccount, "kind">; balance: number }>
): number {
  return (
    Math.round(
      rows
        .filter((row) => isLiquidityAccount(row.account))
        .reduce((sum, row) => sum + Number(row.balance || 0), 0) * 100
    ) / 100
  );
}

export interface AccountExpenseLike {
  amount: number;
  category?: string | null;
  concept?: string | null;
  paid_by?: string;
  responsible_for?: string | null;
  account_id?: string | null;
  paid_from_account?: boolean | null;
  fund_id?: string | null;
  paid_from_fund?: boolean | null;
  is_active?: boolean | null;
  transfer_group_id?: string | null;
}

/**
 * Ledger row that only moves account cash (not a bolsillo).
 * Fund balances must ignore these until an explicit account→fund transfer.
 */
export function isAccountOnlyMovement(expense: {
  account_id?: string | null;
  fund_id?: string | null;
}): boolean {
  return Boolean(expense.account_id) && !expense.fund_id;
}

export function isAllowedAccountColor(color: string) {
  return ACCOUNT_COLOR_OPTIONS.some(
    (option) => option.value.toLowerCase() === color.toLowerCase()
  );
}

export function resolveAccountColor(account?: Pick<FamilyAccount, "color" | "scope"> | null) {
  if (account?.color) return account.color;
  if (account?.scope === "personal") return DEFAULT_PERSONAL_ACCOUNT_COLOR;
  return DEFAULT_SHARED_ACCOUNT_COLOR;
}

export function listActiveAccounts(accounts: FamilyAccount[]) {
  return [...accounts]
    .filter((a) => !a.archived_at)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"));
}

/**
 * Accounts the viewer may see (saldo y movimientos).
 * Shared always; personal if owner or family_visible.
 */
export function listVisibleAccountsForUser(accounts: FamilyAccount[], userId: string) {
  return listActiveAccounts(accounts).filter(
    (a) =>
      a.scope === "shared" ||
      a.owner_profile_id === userId ||
      a.visibility === "family_visible"
  );
}

/** Accounts the actor may operate (ingresar / transferir / pagar). */
export function listOperableAccountsForUser(accounts: FamilyAccount[], userId: string) {
  return listActiveAccounts(accounts).filter(
    (a) => a.scope === "shared" || a.owner_profile_id === userId
  );
}

/**
 * Checking accounts the actor may pay expenses from
 * (same set as the Cuentas tab — not credit or investment).
 */
export function listPayableAccountsForUser(accounts: FamilyAccount[], userId: string) {
  return listOperableAccountsForUser(accounts, userId).filter((a) => isLiquidityAccount(a));
}

export function canViewAccount(account: FamilyAccount, userId: string) {
  if (account.archived_at) return false;
  if (account.scope === "shared") return true;
  if (account.owner_profile_id === userId) return true;
  return account.visibility === "family_visible";
}

export function canOperateAccount(account: FamilyAccount, userId: string) {
  if (account.archived_at) return false;
  if (account.scope === "shared") return true;
  return account.owner_profile_id === userId;
}

/**
 * Cash balance of an account (caja bancaria simulada).
 * Mirror of calculateFundCashBalance for account_id / paid_from_account.
 */
export function calculateAccountCashBalance(
  expenses: AccountExpenseLike[],
  accountId: string
): number {
  const rows = expenses.filter(
    (e) => e.is_active !== false && e.account_id === accountId
  );

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
        e.paid_from_account === true &&
        !e.transfer_group_id
    )
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const withdrawals = rows
    .filter((e) => e.category === "withdrawal" && !e.transfer_group_id)
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const transferOut = rows
    .filter((e) => e.category === "withdrawal" && !!e.transfer_group_id)
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    Math.round((deposits + transferIn - cashOut - withdrawals - transferOut) * 100) / 100
  );
}

export function responsibleForAccount(account: FamilyAccount): string {
  return account.scope === "shared" ? "joint_fund" : (account.owner_profile_id as string);
}

/** True when a movement row should be hidden from a partner (private foreign account). */
export function isPrivateForeignAccountMovement(
  expense: Pick<AccountExpenseLike, "account_id">,
  accountsById: Map<string, FamilyAccount> | Record<string, FamilyAccount>,
  viewerUserId: string
): boolean {
  const accountId = expense.account_id;
  if (!accountId) return false;

  const account =
    accountsById instanceof Map ? accountsById.get(accountId) : accountsById[accountId];
  if (!account) return false;
  if (account.scope !== "personal") return false;
  if (account.visibility !== "private") return false;
  return account.owner_profile_id !== viewerUserId;
}
