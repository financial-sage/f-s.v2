"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  AccountKind,
  AccountScope,
  AccountVisibility,
  FamilyAccount,
} from "@/lib/accounts";
import {
  calculateAccountCashBalance,
  canOperateAccount,
  DEFAULT_CASH_ACCOUNT_COLOR,
  DEFAULT_CASH_ACCOUNT_NAME,
  DEFAULT_PERSONAL_ACCOUNT_COLOR,
  DEFAULT_SHARED_ACCOUNT_COLOR,
  isAllowedAccountColor,
  isCreditAccount,
  isInvestmentAccount,
  isLiquidityAccount,
  listVisibleAccountsForUser,
  normalizeAccountKind,
  responsibleForAccount,
  sumVisibleLiquidity,
} from "@/lib/accounts";
import { getFamilyFundsFast } from "@/app/actions/funds";
import {
  calculateFundCashBalance,
  getDefaultSharedFund,
  isIndividualSharedSystemFund,
  listAccountTransferFunds,
  type FamilyFund,
} from "@/lib/funds";
import { isIndividualHousehold } from "@/lib/household";
import { perfLog, perfNow } from "@/lib/perf";
import {
  getRequestFamilyId,
  getRequestFamilyMemberCount,
  requireRequestFamilyId,
  requireRequestUser,
} from "@/lib/request-context";

export type AccountActionResult = {
  success: true;
  balanceWarning?: boolean;
  transferGroupId?: string;
  accountId?: string;
  firstMoveTrialStarted?: boolean;
};

async function requireUser() {
  return requireRequestUser();
}

async function getUserFamilyId(userId: string) {
  return requireRequestFamilyId(userId);
}

function migrationHint(errorMessage: string) {
  if (/family_accounts_kind|column.*kind/i.test(errorMessage)) {
    return "Falta aplicar la migración de tipos de cuenta (006_account_kind_fixed_frequency.sql).";
  }
  if (/family_accounts|account_id|paid_from_account/i.test(errorMessage)) {
    return "Falta aplicar la migración de cuentas (family_accounts). Ejecuta database/migrations/003_family_accounts.sql";
  }
  return errorMessage;
}

function mapAccountRow(row: Record<string, unknown>): FamilyAccount {
  return {
    ...(row as unknown as FamilyAccount),
    kind: normalizeAccountKind(row.kind),
  };
}

function revalidateAccountsPaths() {
  // Avoid rebuilding home RSC on every account mutation — dashboard uses Zustand.
  revalidatePath("/accounts");
  revalidatePath("/history");
}

export async function loadFamilyAccountsForFamily(
  familyId: string
): Promise<FamilyAccount[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("family_accounts")
    .select("*")
    .eq("family_id", familyId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(migrationHint(error.message));
  }

  return (data ?? []).map((row) => mapAccountRow(row as Record<string, unknown>));
}

async function loadFamilyAccounts(familyId: string): Promise<FamilyAccount[]> {
  return loadFamilyAccountsForFamily(familyId);
}

async function getFamilyMemberCount(familyId: string): Promise<number> {
  return getRequestFamilyMemberCount(familyId);
}

/**
 * Ensure the member has a personal cash account ("Efectivo").
 * Seeded for every user; not system-locked — can rename/archive.
 * Skips if they already have one (active or archived) so delete sticks.
 */
export async function ensurePersonalCashAccount(
  familyId: string,
  userId: string
): Promise<FamilyAccount[]> {
  const admin = getSupabaseAdminClient();

  const { data: existingRows, error: existingError } = await admin
    .from("family_accounts")
    .select("id")
    .eq("family_id", familyId)
    .eq("owner_profile_id", userId)
    .eq("scope", "personal")
    .ilike("name", DEFAULT_CASH_ACCOUNT_NAME)
    .limit(1);

  if (existingError) {
    throw new Error(migrationHint(existingError.message));
  }
  if ((existingRows ?? []).length > 0) {
    return loadFamilyAccounts(familyId);
  }

  const accounts = await loadFamilyAccounts(familyId);
  const payload = {
    family_id: familyId,
    name: DEFAULT_CASH_ACCOUNT_NAME,
    scope: "personal" as const,
    owner_profile_id: userId,
    visibility: "private" as const,
    kind: "checking" as const,
    sort_order: 105,
    color: DEFAULT_CASH_ACCOUNT_COLOR,
  };

  const { data, error } = await admin
    .from("family_accounts")
    .insert(payload as never)
    .select("*")
    .single();

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return loadFamilyAccounts(familyId);
    }
    if (/kind/i.test(error.message)) {
      const { kind: _kind, ...withoutKind } = payload;
      const retry = await admin
        .from("family_accounts")
        .insert(withoutKind as never)
        .select("*")
        .single();
      if (retry.error) throw new Error(migrationHint(retry.error.message));
      return [...accounts, mapAccountRow(retry.data as Record<string, unknown>)];
    }
    throw new Error(migrationHint(error.message));
  }

  return [...accounts, mapAccountRow(data as Record<string, unknown>)];
}

/** @deprecated Prefer ensurePersonalCashAccount — kept for call-site compatibility. */
export async function ensurePersonalAccount(
  familyId: string,
  userId: string
): Promise<FamilyAccount[]> {
  return ensurePersonalCashAccount(familyId, userId);
}

async function loadActiveExpenses(familyId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("expenses")
    .select(
      "amount, category, concept, paid_by, responsible_for, fund_id, paid_from_fund, account_id, paid_from_account, transfer_group_id, is_active, is_settled"
    )
    .eq("family_id", familyId)
    .eq("is_active", true)
    // Balances only need ledger rows tied to an account.
    .not("account_id", "is", null);

  if (error) {
    throw new Error(migrationHint(error.message));
  }

  return (data ?? []) as Array<{
    amount: number;
    category?: string | null;
    concept?: string | null;
    paid_by: string;
    responsible_for?: string | null;
    fund_id?: string | null;
    paid_from_fund?: boolean | null;
    account_id?: string | null;
    paid_from_account?: boolean | null;
    transfer_group_id?: string | null;
    is_active?: boolean | null;
    is_settled?: boolean | null;
  }>;
}

/** Read-only fund list for the accounts transfer sheet (no ensure/create side effects). */
async function loadFamilyFundsForAccounts(familyId: string): Promise<FamilyFund[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("family_funds")
    .select(
      "id, family_id, name, scope, owner_profile_id, is_default, is_system, sort_order, archived_at, color, purpose, created_at, updated_at"
    )
    .eq("family_id", familyId)
    .is("archived_at", null)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as FamilyFund[];
}

function requireOperableAccount(
  accounts: FamilyAccount[],
  accountId: string,
  userId: string,
  label = "cuenta"
) {
  const account = accounts.find((a) => a.id === accountId && !a.archived_at);
  if (!account) throw new Error(`No encontramos esa ${label}.`);
  if (!canOperateAccount(account, userId)) {
    throw new Error("Solo puedes operar tus propias cuentas personales o las compartidas.");
  }
  return account;
}

export async function listFamilyAccountsAction(): Promise<FamilyAccount[]> {
  const user = await requireUser();
  const familyId = await getRequestFamilyId(user.id);
  // Layout/stores hydrate before onboarding — never 500 when family is missing.
  if (!familyId) return [];
  const accounts = await loadFamilyAccounts(familyId);
  return listVisibleAccountsForUser(accounts, user.id);
}

export async function createAccountAction(input: {
  name: string;
  scope: AccountScope;
  visibility?: AccountVisibility;
  color?: string;
  kind?: AccountKind;
  /** Credit: initial debt owed. Investment: initial value. Ignored for checking. */
  initialAmount?: number;
}): Promise<FamilyAccount> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const memberCount = await getFamilyMemberCount(familyId);
  const name = input.name.trim();
  const scope = input.scope;
  const kind = normalizeAccountKind(input.kind);

  if (isIndividualHousehold(memberCount) && scope === "shared") {
    throw new Error("En un espacio individual solo puedes crear cuentas personales.");
  }

  const visibility: AccountVisibility = isIndividualHousehold(memberCount)
    ? "private"
    : scope === "shared"
      ? "family_visible"
      : (input.visibility ?? "private");
  const color = (
    input.color ??
    (scope === "shared" ? DEFAULT_SHARED_ACCOUNT_COLOR : DEFAULT_PERSONAL_ACCOUNT_COLOR)
  ).trim();

  if (!name) throw new Error("El nombre de la cuenta es obligatorio.");
  if (name.length > 40) throw new Error("El nombre es demasiado largo.");
  if (scope === "personal" && visibility !== "private" && visibility !== "family_visible") {
    throw new Error("Elige una visibilidad válida.");
  }
  if (!isAllowedAccountColor(color)) {
    throw new Error("Selecciona un color válido.");
  }

  const initialAmount = Number(input.initialAmount ?? 0);
  if (initialAmount < 0 || !Number.isFinite(initialAmount)) {
    throw new Error("Ingresa un importe inicial válido.");
  }

  const { assertCanCreateAccount } = await import("@/lib/premiumServer");
  await assertCanCreateAccount(familyId);

  const admin = getSupabaseAdminClient();
  const payload =
    scope === "shared"
      ? {
          family_id: familyId,
          name,
          scope: "shared" as const,
          owner_profile_id: null,
          visibility: "family_visible" as const,
          kind,
          sort_order: 100,
          color,
        }
      : {
          family_id: familyId,
          name,
          scope: "personal" as const,
          owner_profile_id: user.id,
          visibility,
          kind,
          sort_order: 110,
          color,
        };

  const { data, error } = await admin
    .from("family_accounts")
    .insert(payload as never)
    .select("*")
    .single();

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      throw new Error("Ya existe una cuenta con ese nombre.");
    }
    throw new Error(migrationHint(error.message));
  }

  const account = mapAccountRow(data as Record<string, unknown>);

  if (initialAmount > 0.009) {
    const amountFixed = Number(initialAmount.toFixed(2));
    const expenseDate = new Date().toISOString().slice(0, 10);
    if (kind === "credit") {
      // Withdrawal without transfer → ledger balance = −debt
      const { error: debtError } = await admin.from("expenses").insert({
        family_id: familyId,
        amount: amountFixed,
        concept: `Deuda inicial · ${account.name}`,
        category: "withdrawal",
        split_type: "personal",
        responsible_for: responsibleForAccount(account),
        paid_by: user.id,
        payer_share_pct: 100,
        is_settled: true,
        account_id: account.id,
        paid_from_account: true,
        fund_id: null,
        paid_from_fund: false,
        expense_date: expenseDate,
      } as never);
      if (debtError) throw new Error(migrationHint(debtError.message));
    } else if (kind === "investment") {
      const { error: valueError } = await admin.from("expenses").insert({
        family_id: familyId,
        amount: amountFixed,
        concept: `Valor inicial · ${account.name}`,
        category: "deposit",
        split_type: "personal",
        responsible_for: responsibleForAccount(account),
        paid_by: user.id,
        payer_share_pct: 100,
        is_settled: true,
        account_id: account.id,
        paid_from_account: false,
        fund_id: null,
        paid_from_fund: false,
        expense_date: expenseDate,
      } as never);
      if (valueError) throw new Error(migrationHint(valueError.message));
    }
  }

  revalidateAccountsPaths();
  return account;
}

export async function updateAccountVisibilityAction(input: {
  accountId: string;
  visibility: AccountVisibility;
}): Promise<FamilyAccount> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const memberCount = await getFamilyMemberCount(familyId);
  if (isIndividualHousehold(memberCount)) {
    throw new Error("La visibilidad entre miembros no aplica en un espacio individual.");
  }
  const admin = getSupabaseAdminClient();

  const { data: row, error: loadError } = await admin
    .from("family_accounts")
    .select("*")
    .eq("id", input.accountId)
    .eq("family_id", familyId)
    .maybeSingle();

  if (loadError || !row) throw new Error("No encontramos esa cuenta.");
  const account = row as FamilyAccount;

  if (account.archived_at) throw new Error("Esta cuenta está archivada.");
  if (account.scope !== "personal") {
    throw new Error("Las cuentas compartidas siempre son visibles para la pareja.");
  }
  if (account.owner_profile_id !== user.id) {
    throw new Error("Solo puedes cambiar la visibilidad de tus cuentas personales.");
  }
  if (input.visibility !== "private" && input.visibility !== "family_visible") {
    throw new Error("Elige una visibilidad válida.");
  }

  const { data, error } = await admin
    .from("family_accounts")
    .update({
      visibility: input.visibility,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", input.accountId)
    .eq("family_id", familyId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  revalidateAccountsPaths();
  return data as FamilyAccount;
}

export async function updateAccountAction(input: {
  accountId: string;
  name?: string;
  color?: string;
}): Promise<FamilyAccount> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const accounts = await loadFamilyAccounts(familyId);
  const account = accounts.find((a) => a.id === input.accountId && !a.archived_at);
  if (!account) throw new Error("No encontramos esa cuenta.");

  if (account.scope === "personal") {
    if (account.owner_profile_id !== user.id) {
      throw new Error("Solo puedes editar tus cuentas personales.");
    }
  } else if (!canOperateAccount(account, user.id)) {
    throw new Error("No puedes editar esta cuenta.");
  }

  const updates: Record<string, string> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("El nombre de la cuenta es obligatorio.");
    if (name.length > 40) throw new Error("El nombre es demasiado largo.");
    updates.name = name;
  }

  if (input.color !== undefined) {
    const color = input.color.trim();
    if (!isAllowedAccountColor(color)) {
      throw new Error("Selecciona un color válido.");
    }
    updates.color = color;
  }

  if (Object.keys(updates).length <= 1) {
    return account;
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("family_accounts")
    .update(updates as never)
    .eq("id", account.id)
    .eq("family_id", familyId)
    .select("*")
    .single();

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      throw new Error("Ya existe una cuenta con ese nombre.");
    }
    throw new Error(error.message);
  }

  revalidateAccountsPaths();
  return mapAccountRow(data as Record<string, unknown>);
}

export async function archiveAccountAction(input: {
  accountId: string;
  confirmNonZeroBalance?: boolean;
}) {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const accounts = await loadFamilyAccounts(familyId);
  const account = requireOperableAccount(accounts, input.accountId, user.id);

  const expenses = await loadActiveExpenses(familyId);
  const balance = calculateAccountCashBalance(expenses, account.id);

  if (Math.abs(balance) > 0.009 && !input.confirmNonZeroBalance) {
    throw new Error(
      "Esta cuenta aún tiene saldo. Confirma para archivarla de todas formas."
    );
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("family_accounts")
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", account.id);

  if (error) throw new Error(error.message);

  revalidateAccountsPaths();
  return { success: true as const, balance };
}

export async function registerAccountIncomeAction(input: {
  accountId: string;
  amount: number;
  date?: string;
  concept?: string;
}): Promise<AccountActionResult> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const amount = Number(input.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Ingresa un importe válido.");
  }

  const accounts = await loadFamilyAccounts(familyId);
  const account = requireOperableAccount(accounts, input.accountId, user.id);

  if (isCreditAccount(account)) {
    throw new Error(
      "En una tarjeta registra la deuda o págala desde una cuenta bancaria; no uses ingreso."
    );
  }

  const admin = getSupabaseAdminClient();
  const payload = {
    family_id: familyId,
    amount: Number(amount.toFixed(2)),
    concept: input.concept?.trim() || `Ingreso en ${account.name}`,
    category: "deposit",
    split_type: "personal",
    responsible_for: responsibleForAccount(account),
    paid_by: user.id,
    payer_share_pct: 100,
    is_settled: true,
    account_id: account.id,
    paid_from_account: false,
    fund_id: null,
    paid_from_fund: false,
    expense_date: input.date ?? new Date().toISOString().slice(0, 10),
  };

  const { error } = await admin.from("expenses").insert(payload as never);
  if (error) throw new Error(migrationHint(error.message));

  const { maybeStartCoupleTrialOnFirstMovement } = await import("@/lib/premiumServer");
  const trial = await maybeStartCoupleTrialOnFirstMovement({
    familyId,
    actorUserId: user.id,
    kind: "income",
  });

  revalidateAccountsPaths();
  const result: AccountActionResult = {
    success: true,
    accountId: account.id,
    firstMoveTrialStarted: trial.started,
  };
  return result;
}

export async function transferBetweenAccountsAction(input: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date?: string;
}): Promise<AccountActionResult> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const amount = Number(input.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Ingresa un importe válido.");
  }
  if (input.fromAccountId === input.toAccountId) {
    throw new Error("Elige dos cuentas distintas.");
  }

  const accounts = await loadFamilyAccounts(familyId);
  const from = requireOperableAccount(accounts, input.fromAccountId, user.id, "cuenta de origen");
  const to = accounts.find((a) => a.id === input.toAccountId && !a.archived_at);
  if (!to) throw new Error("No encontramos la cuenta de destino.");

  // Matrix: personal→shared (owner), shared→personal (own personal), personal→personal (same owner)
  if (to.scope === "personal" && to.owner_profile_id !== user.id) {
    throw new Error("Solo puedes transferir hacia tu propia cuenta personal o una compartida.");
  }
  if (from.scope === "personal" && to.scope === "personal" && from.owner_profile_id !== to.owner_profile_id) {
    throw new Error("No puedes transferir entre cuentas personales de distintas personas.");
  }

  // Credit is a payment destination (or rare refund source → liquidity only).
  if (isCreditAccount(from) && !isLiquidityAccount(to)) {
    throw new Error("Desde una tarjeta solo puedes mover hacia una cuenta bancaria.");
  }
  if (isCreditAccount(to) && !isLiquidityAccount(from) && !isInvestmentAccount(from)) {
    throw new Error("Para pagar la tarjeta usa una cuenta bancaria.");
  }
  if (isInvestmentAccount(to) && !isLiquidityAccount(from)) {
    throw new Error("Aporta a la inversión desde una cuenta bancaria.");
  }
  if (isInvestmentAccount(from) && !isLiquidityAccount(to)) {
    throw new Error("Retira la inversión hacia una cuenta bancaria.");
  }

  const expenses = await loadActiveExpenses(familyId);
  const balance = calculateAccountCashBalance(expenses, from.id);
  // Credit ledger is typically negative (debt); skip "liquidez negativa" warning on credit sources.
  const balanceWarning =
    isLiquidityAccount(from) || isInvestmentAccount(from)
      ? balance - amount < -0.009
      : false;

  const transferGroupId = crypto.randomUUID();
  const expenseDate = input.date ?? new Date().toISOString().slice(0, 10);
  const amountFixed = Number(amount.toFixed(2));
  const admin = getSupabaseAdminClient();

  const { error } = await admin.from("expenses").insert([
    {
      family_id: familyId,
      amount: amountFixed,
      concept: `Transferencia a ${to.name}`,
      category: "withdrawal",
      split_type: "personal",
      responsible_for: responsibleForAccount(from),
      paid_by: user.id,
      payer_share_pct: 100,
      is_settled: true,
      account_id: from.id,
      paid_from_account: true,
      fund_id: null,
      paid_from_fund: false,
      transfer_group_id: transferGroupId,
      expense_date: expenseDate,
    },
    {
      family_id: familyId,
      amount: amountFixed,
      concept: `Transferencia desde ${from.name}`,
      category: "deposit",
      split_type: "personal",
      responsible_for: responsibleForAccount(to),
      paid_by: user.id,
      payer_share_pct: 100,
      is_settled: true,
      account_id: to.id,
      paid_from_account: false,
      fund_id: null,
      paid_from_fund: false,
      transfer_group_id: transferGroupId,
      expense_date: expenseDate,
    },
  ] as never);

  if (error) throw new Error(migrationHint(error.message));

  revalidateAccountsPaths();
  return { success: true, balanceWarning, transferGroupId };
}

export async function transferAccountToFundAction(input: {
  fromAccountId: string;
  toFundId: string;
  amount: number;
  date?: string;
}): Promise<AccountActionResult> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const amount = Number(input.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Ingresa un importe válido.");
  }

  const accounts = await loadFamilyAccounts(familyId);
  const from = requireOperableAccount(accounts, input.fromAccountId, user.id, "cuenta de origen");
  if (isCreditAccount(from)) {
    throw new Error("No puedes mover desde una tarjeta a un bolsillo. Paga la tarjeta desde una cuenta bancaria.");
  }

  const [funds, memberCount] = await Promise.all([
    getFamilyFundsFast(familyId),
    getFamilyMemberCount(familyId),
  ]);
  const to = funds.find((f) => f.id === input.toFundId && !f.archived_at);
  if (!to) throw new Error("No encontramos ese bolsillo.");
  if (
    isIndividualHousehold(memberCount) &&
    to.scope === "shared" &&
    !isIndividualSharedSystemFund(to)
  ) {
    throw new Error(
      "En un espacio individual solo puedes usar tus bolsillos, Ahorro o Gastos fijos."
    );
  }
  if (to.scope === "personal" && to.owner_profile_id !== user.id) {
    throw new Error("Solo puedes transferir hacia tu bolsillo personal.");
  }

  const expenses = await loadActiveExpenses(familyId);
  const balance = calculateAccountCashBalance(expenses, from.id);
  const balanceWarning = balance - amount < -0.009;

  const transferGroupId = crypto.randomUUID();
  const expenseDate = input.date ?? new Date().toISOString().slice(0, 10);
  const amountFixed = Number(amount.toFixed(2));
  const fundResponsible =
    to.scope === "shared" ? "joint_fund" : (to.owner_profile_id as string);
  const admin = getSupabaseAdminClient();

  const { error } = await admin.from("expenses").insert([
    {
      family_id: familyId,
      amount: amountFixed,
      concept: `A ${to.name}`,
      category: "withdrawal",
      split_type: "personal",
      responsible_for: responsibleForAccount(from),
      paid_by: user.id,
      payer_share_pct: 100,
      is_settled: true,
      account_id: from.id,
      paid_from_account: true,
      fund_id: null,
      paid_from_fund: false,
      transfer_group_id: transferGroupId,
      expense_date: expenseDate,
    },
    {
      family_id: familyId,
      amount: amountFixed,
      concept: `Desde ${from.name}`,
      category: "deposit",
      split_type: "personal",
      responsible_for: fundResponsible,
      paid_by: user.id,
      payer_share_pct: 100,
      is_settled: true,
      fund_id: to.id,
      paid_from_fund: false,
      account_id: null,
      paid_from_account: false,
      transfer_group_id: transferGroupId,
      expense_date: expenseDate,
    },
  ] as never);

  if (error) throw new Error(migrationHint(error.message));

  revalidateAccountsPaths();
  return { success: true, balanceWarning, transferGroupId };
}

export async function transferFundToAccountAction(input: {
  fromFundId: string;
  toAccountId: string;
  amount: number;
  date?: string;
}): Promise<AccountActionResult> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const amount = Number(input.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Ingresa un importe válido.");
  }

  const [funds, memberCount] = await Promise.all([
    getFamilyFundsFast(familyId),
    getFamilyMemberCount(familyId),
  ]);
  const from = funds.find((f) => f.id === input.fromFundId && !f.archived_at);
  if (!from) throw new Error("No encontramos ese bolsillo.");
  if (
    isIndividualHousehold(memberCount) &&
    from.scope === "shared" &&
    !isIndividualSharedSystemFund(from)
  ) {
    throw new Error(
      "En un espacio individual solo puedes usar tus bolsillos, Ahorro o Gastos fijos."
    );
  }
  if (from.scope === "personal" && from.owner_profile_id !== user.id) {
    throw new Error("Solo puedes transferir desde tu bolsillo personal.");
  }

  const accounts = await loadFamilyAccounts(familyId);
  const to = accounts.find((a) => a.id === input.toAccountId && !a.archived_at);
  if (!to) throw new Error("No encontramos la cuenta de destino.");
  if (to.scope === "personal" && to.owner_profile_id !== user.id) {
    throw new Error("Solo puedes transferir hacia tu propia cuenta personal o una compartida.");
  }

  const expenses = await loadActiveExpenses(familyId);
  const defaultShared = getDefaultSharedFund(funds);
  const fundBalance = calculateFundCashBalance(expenses, from.id, {
    treatLegacyJointAsFundId: defaultShared?.id ?? null,
  });

  if (fundBalance + 0.009 < amount) {
    throw new Error("Saldo insuficiente en el bolsillo de origen.");
  }

  const transferGroupId = crypto.randomUUID();
  const expenseDate = input.date ?? new Date().toISOString().slice(0, 10);
  const amountFixed = Number(amount.toFixed(2));
  const fundResponsible =
    from.scope === "shared" ? "joint_fund" : (from.owner_profile_id as string);
  const admin = getSupabaseAdminClient();

  const { error } = await admin.from("expenses").insert([
    {
      family_id: familyId,
      amount: amountFixed,
      concept: `A ${to.name}`,
      category: "withdrawal",
      split_type: "personal",
      responsible_for: fundResponsible,
      paid_by: user.id,
      payer_share_pct: 100,
      is_settled: true,
      fund_id: from.id,
      paid_from_fund: true,
      account_id: null,
      paid_from_account: false,
      transfer_group_id: transferGroupId,
      expense_date: expenseDate,
    },
    {
      family_id: familyId,
      amount: amountFixed,
      concept: `Desde ${from.name}`,
      category: "deposit",
      split_type: "personal",
      responsible_for: responsibleForAccount(to),
      paid_by: user.id,
      payer_share_pct: 100,
      is_settled: true,
      account_id: to.id,
      paid_from_account: false,
      fund_id: null,
      paid_from_fund: false,
      transfer_group_id: transferGroupId,
      expense_date: expenseDate,
    },
  ] as never);

  if (error) throw new Error(migrationHint(error.message));

  revalidateAccountsPaths();
  return { success: true, transferGroupId };
}

export async function registerExternalOutflowAction(input: {
  accountId: string;
  amount: number;
  date?: string;
  concept?: string;
}): Promise<AccountActionResult> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const amount = Number(input.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Ingresa un importe válido.");
  }

  const accounts = await loadFamilyAccounts(familyId);
  const account = requireOperableAccount(accounts, input.accountId, user.id);

  if (isCreditAccount(account)) {
    throw new Error("Las salidas externas no aplican a tarjetas. Usa un pago desde tu cuenta bancaria.");
  }

  const expenses = await loadActiveExpenses(familyId);
  const balance = calculateAccountCashBalance(expenses, account.id);
  const balanceWarning = balance - amount < -0.009;

  const admin = getSupabaseAdminClient();
  const payload = {
    family_id: familyId,
    amount: Number(amount.toFixed(2)),
    concept: input.concept?.trim() || `Salida desde ${account.name}`,
    category: "withdrawal",
    split_type: "personal",
    responsible_for: responsibleForAccount(account),
    paid_by: user.id,
    payer_share_pct: 100,
    is_settled: true,
    account_id: account.id,
    paid_from_account: true,
    fund_id: null,
    paid_from_fund: false,
    expense_date: input.date ?? new Date().toISOString().slice(0, 10),
  };

  const { error } = await admin.from("expenses").insert(payload as never);
  if (error) throw new Error(migrationHint(error.message));

  revalidateAccountsPaths();
  return { success: true, balanceWarning, accountId: account.id };
}

/**
 * Set the owed amount on a credit account by adjusting the ledger so
 * `calculateAccountCashBalance` ≈ −debt.
 */
export async function setCreditDebtAction(input: {
  accountId: string;
  debt: number;
  date?: string;
}): Promise<AccountActionResult> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const debt = Number(input.debt);

  if (!Number.isFinite(debt) || debt < 0) {
    throw new Error("Ingresa una deuda válida (0 o más).");
  }

  const accounts = await loadFamilyAccounts(familyId);
  const account = requireOperableAccount(accounts, input.accountId, user.id);
  if (!isCreditAccount(account)) {
    throw new Error("Solo puedes ajustar la deuda de una tarjeta de crédito.");
  }

  const expenses = await loadActiveExpenses(familyId);
  const current = calculateAccountCashBalance(expenses, account.id);
  const target = -Number(debt.toFixed(2));
  const delta = Math.round((target - current) * 100) / 100;
  if (Math.abs(delta) < 0.009) {
    return { success: true, accountId: account.id };
  }

  const admin = getSupabaseAdminClient();
  const expenseDate = input.date ?? new Date().toISOString().slice(0, 10);
  const amountFixed = Number(Math.abs(delta).toFixed(2));
  // delta < 0 → more debt → withdrawal; delta > 0 → less debt → deposit
  const category = delta < 0 ? "withdrawal" : "deposit";

  const { error } = await admin.from("expenses").insert({
    family_id: familyId,
    amount: amountFixed,
    concept: `Ajuste de deuda · ${account.name}`,
    category,
    split_type: "personal",
    responsible_for: responsibleForAccount(account),
    paid_by: user.id,
    payer_share_pct: 100,
    is_settled: true,
    account_id: account.id,
    paid_from_account: category === "withdrawal",
    fund_id: null,
    paid_from_fund: false,
    expense_date: expenseDate,
  } as never);

  if (error) throw new Error(migrationHint(error.message));

  revalidateAccountsPaths();
  return { success: true, accountId: account.id };
}

/** Set the current market/value of an investment account. */
export async function setInvestmentValueAction(input: {
  accountId: string;
  value: number;
  date?: string;
}): Promise<AccountActionResult> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const value = Number(input.value);

  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Ingresa un valor válido (0 o más).");
  }

  const accounts = await loadFamilyAccounts(familyId);
  const account = requireOperableAccount(accounts, input.accountId, user.id);
  if (!isInvestmentAccount(account)) {
    throw new Error("Solo puedes actualizar el valor de una inversión.");
  }

  const expenses = await loadActiveExpenses(familyId);
  const current = calculateAccountCashBalance(expenses, account.id);
  const target = Number(value.toFixed(2));
  const delta = Math.round((target - current) * 100) / 100;
  if (Math.abs(delta) < 0.009) {
    return { success: true, accountId: account.id };
  }

  const admin = getSupabaseAdminClient();
  const expenseDate = input.date ?? new Date().toISOString().slice(0, 10);
  const amountFixed = Number(Math.abs(delta).toFixed(2));
  const category = delta > 0 ? "deposit" : "withdrawal";

  const { error } = await admin.from("expenses").insert({
    family_id: familyId,
    amount: amountFixed,
    concept: `Valor actual · ${account.name}`,
    category,
    split_type: "personal",
    responsible_for: responsibleForAccount(account),
    paid_by: user.id,
    payer_share_pct: 100,
    is_settled: true,
    account_id: account.id,
    paid_from_account: category === "withdrawal",
    fund_id: null,
    paid_from_fund: false,
    expense_date: expenseDate,
  } as never);

  if (error) throw new Error(migrationHint(error.message));

  revalidateAccountsPaths();
  return { success: true, accountId: account.id };
}

export type AccountsOverview = {
  accounts: FamilyAccount[];
  balances: Array<{ account: FamilyAccount; balance: number }>;
  totalVisibleLiquidity: number;
  operableAccountIds: string[];
  funds: FamilyFund[];
  currentUserId: string;
};

export async function getAccountsOverviewAction(): Promise<AccountsOverview> {
  const start = perfNow();
  const user = await requireUser();
  const familyId = await getRequestFamilyId(user.id);

  if (!familyId) {
    return {
      accounts: [],
      balances: [],
      totalVisibleLiquidity: 0,
      operableAccountIds: [],
      funds: [],
      currentUserId: user.id,
    };
  }

  const [memberCount, expenses, funds, loadedAccounts] = await Promise.all([
    getFamilyMemberCount(familyId),
    loadActiveExpenses(familyId),
    loadFamilyFundsForAccounts(familyId).catch(() => [] as FamilyFund[]),
    loadFamilyAccounts(familyId),
  ]);

  let accounts = loadedAccounts;
  try {
    accounts = await ensurePersonalCashAccount(familyId, user.id);
  } catch {
    // Migration may not be applied yet; overview still returns what we have.
  }

  const visible = listVisibleAccountsForUser(accounts, user.id);

  const balances = visible.map((account) => ({
    account,
    balance: calculateAccountCashBalance(expenses, account.id),
  }));

  const totalVisibleLiquidity = sumVisibleLiquidity(balances);

  const overview: AccountsOverview = {
    accounts: visible,
    balances,
    totalVisibleLiquidity,
    operableAccountIds: visible
      .filter((a) => canOperateAccount(a, user.id))
      .map((a) => a.id),
    funds: listAccountTransferFunds(funds, user.id, {
      individual: isIndividualHousehold(memberCount),
    }),
    currentUserId: user.id,
  };
  perfLog("getAccountsOverviewAction", {
    ms: perfNow() - start,
    accounts: visible.length,
    expenses: expenses.length,
  });
  return overview;
}
