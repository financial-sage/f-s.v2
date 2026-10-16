"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";
import type {
  AccountScope,
  AccountVisibility,
  FamilyAccount,
} from "@/lib/accounts";
import {
  calculateAccountCashBalance,
  canOperateAccount,
  DEFAULT_PERSONAL_ACCOUNT_COLOR,
  DEFAULT_SHARED_ACCOUNT_COLOR,
  isAllowedAccountColor,
  listVisibleAccountsForUser,
  responsibleForAccount,
} from "@/lib/accounts";
import { ensureFamilyFunds } from "@/app/actions/funds";
import {
  calculateFundCashBalance,
  getDefaultSharedFund,
  type FamilyFund,
} from "@/lib/funds";

export type AccountActionResult = {
  success: true;
  balanceWarning?: boolean;
  transferGroupId?: string;
  accountId?: string;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

async function getUserFamilyId(userId: string) {
  const admin = getSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("family_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile?.family_id) {
    throw new Error("Debes pertenecer a una familia.");
  }

  return profile.family_id as string;
}

function migrationHint(errorMessage: string) {
  if (/family_accounts|account_id|paid_from_account/i.test(errorMessage)) {
    return "Falta aplicar la migración de cuentas (family_accounts). Ejecuta database/migrations/003_family_accounts.sql";
  }
  return errorMessage;
}

function revalidateAccountsPaths() {
  revalidatePath("/");
  revalidatePath("/accounts");
  revalidatePath("/history");
  revalidatePath("/profile");
}

async function loadFamilyAccounts(familyId: string): Promise<FamilyAccount[]> {
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

  return (data ?? []) as FamilyAccount[];
}

async function loadActiveExpenses(familyId: string) {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("expenses")
    .select(
      "amount, category, concept, paid_by, responsible_for, fund_id, paid_from_fund, account_id, paid_from_account, transfer_group_id, is_active, is_settled"
    )
    .eq("family_id", familyId)
    .eq("is_active", true);

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
  const familyId = await getUserFamilyId(user.id);
  const accounts = await loadFamilyAccounts(familyId);
  return listVisibleAccountsForUser(accounts, user.id);
}

export async function createAccountAction(input: {
  name: string;
  scope: AccountScope;
  visibility?: AccountVisibility;
  color?: string;
}): Promise<FamilyAccount> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const name = input.name.trim();
  const scope = input.scope;
  const visibility: AccountVisibility =
    scope === "shared" ? "family_visible" : (input.visibility ?? "private");
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

  const admin = getSupabaseAdminClient();
  const payload =
    scope === "shared"
      ? {
          family_id: familyId,
          name,
          scope: "shared" as const,
          owner_profile_id: null,
          visibility: "family_visible" as const,
          sort_order: 100,
          color,
        }
      : {
          family_id: familyId,
          name,
          scope: "personal" as const,
          owner_profile_id: user.id,
          visibility,
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

  revalidateAccountsPaths();
  return data as FamilyAccount;
}

export async function updateAccountVisibilityAction(input: {
  accountId: string;
  visibility: AccountVisibility;
}): Promise<FamilyAccount> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
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

  revalidateAccountsPaths();
  return { success: true, accountId: account.id };
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

  const expenses = await loadActiveExpenses(familyId);
  const balance = calculateAccountCashBalance(expenses, from.id);
  const balanceWarning = balance - amount < -0.009;

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

  const funds = await ensureFamilyFunds(familyId);
  const to = funds.find((f) => f.id === input.toFundId && !f.archived_at);
  if (!to) throw new Error("No encontramos ese bolsillo.");
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

  const funds = await ensureFamilyFunds(familyId);
  const from = funds.find((f) => f.id === input.fromFundId && !f.archived_at);
  if (!from) throw new Error("No encontramos ese bolsillo.");
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

export async function getAccountsOverviewAction() {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const accounts = await loadFamilyAccounts(familyId);
  const visible = listVisibleAccountsForUser(accounts, user.id);
  const expenses = await loadActiveExpenses(familyId);

  let funds: FamilyFund[] = [];
  try {
    funds = await ensureFamilyFunds(familyId);
  } catch {
    funds = [];
  }

  const balances = visible.map((account) => ({
    account,
    balance: calculateAccountCashBalance(expenses, account.id),
  }));

  const totalVisibleLiquidity =
    Math.round(balances.reduce((s, b) => s + b.balance, 0) * 100) / 100;

  return {
    accounts: visible,
    balances,
    totalVisibleLiquidity,
    operableAccountIds: visible
      .filter((a) => canOperateAccount(a, user.id))
      .map((a) => a.id),
    funds: funds.filter(
      (f) =>
        !f.archived_at &&
        (f.scope === "shared" || f.owner_profile_id === user.id)
    ),
    currentUserId: user.id,
  };
}
