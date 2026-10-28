"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";
import type { ExpenseSplitType } from "@/lib/expenses";
import {
  depositToFundAction,
  getFamilyFundsFast,
} from "@/app/actions/funds";
import { getDefaultSharedFund, getPersonalFund } from "@/lib/funds";
import {
  calculateAccountCashBalance,
  canOperateAccount,
  isLiquidityAccount,
  responsibleForAccount,
  type FamilyAccount,
} from "@/lib/accounts";
export type ExpenseActor = "me" | "partner" | "joint_fund";
export type ExpenseResponsibleFor = "joint_fund" | "me" | "partner";
export type ExpenseCategory = string;

interface SaveExpenseInput {
  amount: number;
  concept: string;
  paidBy: ExpenseActor;
  responsibleFor: ExpenseResponsibleFor;
  payerSharePct: number;
  /** Legacy text label (optional; derived from category name when omitted). */
  category?: ExpenseCategory;
  /** family_categories id (parent or subcategory). Required for ordinary expenses. */
  categoryId: string;
  date: string;
  splitTypeOverride?: ExpenseSplitType;
  /** Pocket this expense belongs to. Required for shared-fund allocation. */
  fundId?: string | null;
  /** True when cash leaves the fund pocket (paid from fund caja). */
  paidFromFund?: boolean;
  /** Account cash source (when paying from a bank-like account). */
  accountId?: string | null;
  /** True when cash leaves the account caja. */
  paidFromAccount?: boolean;
}

function resolveActor(
  selection: ExpenseActor | ExpenseResponsibleFor,
  currentUserId: string,
  partnerUserId: string | null
) {
  if (selection === "me") {
    return currentUserId;
  }

  if (selection === "partner") {
    if (!partnerUserId) {
      throw new Error("Aún no tienes una pareja vinculada.");
    }

    return partnerUserId;
  }

  return currentUserId;
}

async function insertExpenseRow(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  payload: Record<string, unknown>
): Promise<{ id: string | null; error: { message: string } | null }> {
  const { data, error } = await admin
    .from("expenses")
    .insert(payload as never)
    .select("id")
    .single();
  const idFromData =
    data && typeof (data as { id?: unknown }).id === "string"
      ? (data as { id: string }).id
      : null;
  if (!error && idFromData) {
    return { id: idFromData, error: null };
  }
  // Fallback without select (older clients / RLS quirks), then resolve id.
  if (error && /select|returning/i.test(error.message)) {
    const retry = await admin.from("expenses").insert(payload as never);
    if (retry.error) return { id: null, error: retry.error };
  } else if (error) {
    return { id: null, error };
  }

  // Insert likely succeeded without a returned id — resolve the newest match.
  const familyId = payload.family_id;
  const concept = payload.concept;
  const amount = payload.amount;
  if (
    typeof familyId === "string" &&
    typeof concept === "string" &&
    typeof amount === "number"
  ) {
    const { data: found } = await admin
      .from("expenses")
      .select("id")
      .eq("family_id", familyId)
      .eq("concept", concept)
      .eq("amount", amount)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const foundId =
      found && typeof (found as { id?: unknown }).id === "string"
        ? (found as { id: string }).id
        : null;
    if (foundId) return { id: foundId, error: null };
  }

  return { id: null, error: error ?? { message: "No se pudo obtener el id del gasto." } };
}

export async function saveExpenseAction({
  amount,
  concept,
  paidBy,
  responsibleFor,
  payerSharePct,
  category,
  categoryId,
  date,
  splitTypeOverride,
  fundId,
  paidFromFund,
  accountId,
  paidFromAccount,
}: SaveExpenseInput) {
  const normalizedAmount = Number(amount);
  const normalizedConcept = concept.trim();
  const resolvedCategoryId = String(categoryId ?? "").trim();

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("Ingresa un importe válido.");
  }

  if (!normalizedConcept) {
    throw new Error("Escribe un concepto para el gasto.");
  }

  if (!date) {
    throw new Error("Selecciona una fecha válida.");
  }

  if (!resolvedCategoryId) {
    throw new Error("Elige una categoría para el gasto.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = getSupabaseAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.family_id) {
    throw new Error("Debes pertenecer a una familia para guardar gastos.");
  }

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select("id")
    .eq("family_id", profile.family_id);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const partnerUserId = (profiles ?? []).find((member) => member.id !== user.id)?.id ?? null;

  const { data: categoryRow, error: categoryError } = await admin
    .from("family_categories")
    .select("id, name, scope, owner_profile_id, archived_at, family_id")
    .eq("id", resolvedCategoryId)
    .eq("family_id", profile.family_id)
    .maybeSingle();

  if (categoryError) {
    throw new Error(
      /family_categories|column/i.test(categoryError.message)
        ? "Falta aplicar la migración de categorías."
        : categoryError.message
    );
  }
  if (!categoryRow || categoryRow.archived_at) {
    throw new Error("Elige una categoría válida.");
  }
  if (
    categoryRow.scope === "personal" &&
    categoryRow.owner_profile_id !== user.id
  ) {
    throw new Error("No puedes usar la categoría personal de otra persona.");
  }

  const resolvedCategory =
    category?.trim() || String(categoryRow.name ?? "gasto").trim() || "gasto";

  const isPaidFromAccount = paidFromAccount === true && !!accountId;

  // ── Pay from account (does not touch fund cash) ──────────────────────────
  if (isPaidFromAccount) {
    const { data: accountRow, error: accountError } = await admin
      .from("family_accounts")
      .select("*")
      .eq("id", accountId)
      .eq("family_id", profile.family_id)
      .maybeSingle();

    if (accountError) {
      throw new Error(
        /family_accounts|column/i.test(accountError.message)
          ? "Falta aplicar la migración de cuentas. Ejecuta database/migrations/003_family_accounts.sql"
          : accountError.message
      );
    }

    const account = accountRow as FamilyAccount | null;
    if (!account || account.archived_at) {
      throw new Error("No encontramos esa cuenta.");
    }
    if (!canOperateAccount(account, user.id)) {
      throw new Error("Solo puedes pagar desde tus cuentas personales o las compartidas.");
    }
    if (!isLiquidityAccount(account)) {
      throw new Error(
        "Solo puedes pagar gastos desde una cuenta bancaria o efectivo (no créditos ni inversiones)."
      );
    }

    const { data: accountExpenses } = await admin
      .from("expenses")
      .select("amount, category, account_id, paid_from_account, transfer_group_id, is_active")
      .eq("family_id", profile.family_id)
      .eq("is_active", true);

    const balance = calculateAccountCashBalance(
      (accountExpenses ?? []) as never[],
      account.id
    );
    const balanceWarning = balance - normalizedAmount < -0.009;

    const paidByValue = resolveActor(paidBy === "joint_fund" ? "me" : paidBy, user.id, partnerUserId);

    const payload = {
      family_id: profile.family_id,
      amount: Number(normalizedAmount.toFixed(2)),
      concept: normalizedConcept,
      paid_by: paidByValue,
      responsible_for: responsibleForAccount(account),
      category: resolvedCategory,
      category_id: resolvedCategoryId,
      expense_date: date,
      split_type: "personal" as ExpenseSplitType,
      payer_share_pct: 100,
      fund_id: null,
      paid_from_fund: false,
      account_id: account.id,
      paid_from_account: true,
    };

    let insert = await insertExpenseRow(admin, payload as Record<string, unknown>);
    if (insert.error && /category_id|column/i.test(insert.error.message)) {
      const { category_id: _c, ...withoutCat } = payload;
      insert = await insertExpenseRow(admin, withoutCat as Record<string, unknown>);
    }
    if (insert.error) {
      throw new Error(
        /account_id|paid_from_account|column/i.test(insert.error.message)
          ? "Falta aplicar la migración de cuentas. Ejecuta database/migrations/003_family_accounts.sql"
          : insert.error.message
      );
    }

    const { maybeStartCoupleTrialOnFirstMovement } = await import("@/lib/premiumServer");
    const trial = await maybeStartCoupleTrialOnFirstMovement({
      familyId: profile.family_id,
      actorUserId: user.id,
      kind: "expense",
    });

    revalidatePath("/");
    revalidatePath("/add-expense");
    revalidatePath("/history");
    revalidatePath("/accounts");

    return {
      success: true as const,
      expenseId: insert.id,
      balanceWarning,
      firstMoveTrialStarted: trial.started,
    };
  }

  let funds: Awaited<ReturnType<typeof getFamilyFundsFast>> = [];
  try {
    funds = await getFamilyFundsFast(profile.family_id);
  } catch {
    funds = [];
  }

  const defaultShared = getDefaultSharedFund(funds);
  const personalFund = getPersonalFund(funds, user.id);

  let resolvedFundId = fundId ?? null;
  if (!resolvedFundId) {
    if (responsibleFor === "joint_fund") {
      resolvedFundId = defaultShared?.id ?? null;
    } else if (responsibleFor === "me") {
      resolvedFundId = personalFund?.id ?? null;
    } else if (responsibleFor === "partner" && partnerUserId) {
      resolvedFundId = getPersonalFund(funds, partnerUserId)?.id ?? null;
    }
  }

  const fund = resolvedFundId ? funds.find((f) => f.id === resolvedFundId) : null;
  if (resolvedFundId && !fund) {
    throw new Error("El bolsillo seleccionado no existe.");
  }

  if (
    fund?.scope === "shared" ||
    responsibleFor === "joint_fund" ||
    paidBy === "joint_fund" ||
    paidBy === "partner" ||
    responsibleFor === "partner"
  ) {
    const { assertCoupleFeaturesAllowed } = await import("@/lib/premiumServer");
    await assertCoupleFeaturesAllowed(profile.family_id);
  }
  if (fund?.scope === "personal" && fund.owner_profile_id !== user.id && responsibleFor !== "partner") {
    // partner personal fund only when explicitly charging partner
  }
  if (fund?.scope === "personal" && fund.owner_profile_id && fund.owner_profile_id !== user.id && fund.owner_profile_id !== partnerUserId) {
    throw new Error("No puedes imputar gastos al bolsillo personal de otra persona.");
  }

  const paidByValue = resolveActor(paidBy, user.id, partnerUserId);
  const responsibleForValue =
    fund?.scope === "shared" || responsibleFor === "joint_fund"
      ? "joint_fund"
      : resolveActor(responsibleFor, user.id, partnerUserId);

  const isPaidFromFund = paidFromFund === true || paidBy === "joint_fund";

  if (isPaidFromFund) {
    if (fund?.scope === "shared") {
      // Couple / shared pocket cash-out — ok
    } else if (
      fund?.scope === "personal" &&
      fund.owner_profile_id === user.id
    ) {
      // Individual (or personal) pocket cash-out — ok
    } else {
      throw new Error(
        "Solo puedes pagar desde un bolsillo compartido o desde tu bolsillo personal."
      );
    }
  }

  const normalizedPayerSharePct = Math.max(0, Math.min(100, Number(payerSharePct)));
  const inferredSplitType: ExpenseSplitType =
    fund?.scope === "shared" || responsibleFor === "joint_fund"
      ? isPaidFromFund
        ? "fund_transfer"
        : normalizedPayerSharePct === 50
          ? "shared_equal"
          : "shared_custom"
      : "personal";
  const splitType = splitTypeOverride ?? inferredSplitType;

  const payload = {
    family_id: profile.family_id,
    amount: Number(normalizedAmount.toFixed(2)),
    concept: normalizedConcept,
    paid_by: paidByValue,
    responsible_for: responsibleForValue,
    category: resolvedCategory,
    category_id: resolvedCategoryId,
    expense_date: date,
    split_type: splitType,
    payer_share_pct: splitType.includes("shared") ? normalizedPayerSharePct : 100,
    fund_id: resolvedFundId,
    paid_from_fund: isPaidFromFund,
    account_id: null,
    paid_from_account: false,
  };

  let insert = await insertExpenseRow(admin, payload as Record<string, unknown>);

  if (
    insert.error &&
    /invalid input value for enum/i.test(insert.error.message) &&
    splitType === "fund_transfer"
  ) {
    insert = await insertExpenseRow(admin, {
      ...payload,
      split_type: "shared_custom",
      payer_share_pct: isPaidFromFund ? 0 : payload.payer_share_pct,
    } as Record<string, unknown>);
  }

  if (insert.error && /category_id|column/i.test(insert.error.message)) {
    const { category_id: _c, ...withoutCat } = payload;
    insert = await insertExpenseRow(admin, withoutCat as Record<string, unknown>);
  }

  // Columns may not exist yet if migration not applied — retry without fund/account fields
  if (
    insert.error &&
    /fund_id|paid_from_fund|account_id|paid_from_account|column/i.test(
      insert.error.message
    )
  ) {
    const {
      fund_id: _f,
      paid_from_fund: _p,
      account_id: _a,
      paid_from_account: _pa,
      category_id: _c,
      ...legacyPayload
    } = payload;
    insert = await insertExpenseRow(
      admin,
      legacyPayload as Record<string, unknown>
    );
  }

  if (insert.error) {
    throw new Error(insert.error.message);
  }

  const { maybeStartCoupleTrialOnFirstMovement } = await import("@/lib/premiumServer");
  const trial = await maybeStartCoupleTrialOnFirstMovement({
    familyId: profile.family_id,
    actorUserId: user.id,
    kind: "expense",
  });

  revalidatePath("/");
  revalidatePath("/add-expense");
  revalidatePath("/history");

  return {
    success: true as const,
    expenseId: insert.id,
    firstMoveTrialStarted: trial.started,
  };
}

export async function createDeposit({
  amount,
  date,
  fundId,
}: {
  amount: number;
  date?: string;
  fundId?: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await getSupabaseAdminClient()
      .from("profiles")
      .select("family_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.family_id) {
      throw new Error("Debes pertenecer a una familia para guardar aportes.");
    }

    const funds = await getFamilyFundsFast(profile.family_id);
    const targetId = fundId ?? getDefaultSharedFund(funds)?.id;
    if (!targetId) throw new Error("No hay Bolsillos disponible.");

    return depositToFundAction({ fundId: targetId, amount, date });
  } catch (error) {
    // Fallback legacy path if funds migration is missing
    if (fundId) throw error;

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      throw new Error("Ingresa un importe válido.");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const admin = getSupabaseAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("family_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.family_id) {
      throw new Error("Debes pertenecer a una familia para guardar aportes.");
    }

    const { error: insertError } = await admin.from("expenses").insert({
      family_id: profile.family_id,
      amount: Number(normalizedAmount.toFixed(2)),
      concept: "Aporte al fondo común",
      category: "deposit",
      split_type: "shared_equal",
      responsible_for: "joint_fund",
      paid_by: user.id,
      payer_share_pct: 100,
      is_settled: true,
      expense_date: date ?? new Date().toISOString().slice(0, 10),
    } as never);

    if (insertError) throw new Error(insertError.message);

    const { maybeStartCoupleTrialOnFirstMovement } = await import("@/lib/premiumServer");
    await maybeStartCoupleTrialOnFirstMovement({
      familyId: profile.family_id,
      actorUserId: user.id,
      kind: "income",
    });

    revalidatePath("/");
    revalidatePath("/history");
    return { success: true };
  }
}

export async function createPersonalDeposit({
  amount,
  date,
}: {
  amount: number;
  date?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await getSupabaseAdminClient()
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.family_id) {
    throw new Error("Debes pertenecer a una familia para guardar aportes.");
  }

  const funds = await getFamilyFundsFast(profile.family_id);
  const personal = getPersonalFund(funds, user.id);
  if (!personal) throw new Error("No hay bolsillo personal disponible.");

  return depositToFundAction({
    fundId: personal.id,
    amount,
    date,
    concept: "Aporte personal",
  });
}

export async function deleteExpenseAction(expenseId: string) {
  if (!expenseId) throw new Error("ID de gasto requerido.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = getSupabaseAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.family_id) {
    throw new Error("Debes pertenecer a una familia.");
  }

  const { data: expense, error: loadError } = await admin
    .from("expenses")
    .select(
      "id, paid_by, category, concept, is_active, transfer_group_id, fund_id, family_id"
    )
    .eq("id", expenseId)
    .eq("family_id", profile.family_id)
    .maybeSingle();

  if (loadError) throw new Error(loadError.message);
  if (!expense || expense.is_active === false) {
    throw new Error("No se encontró el movimiento.");
  }

  const concept = String(expense.concept ?? "");
  if (concept === "Reembolso del fondo" || concept.startsWith("Liquidación de deuda")) {
    throw new Error("Este movimiento de sistema no se puede eliminar.");
  }

  const category = String(expense.category ?? "");
  const isCashMovement = category === "deposit" || category === "withdrawal";
  const isOwner = expense.paid_by === user.id;

  // Aportes/retiros: cualquier miembro de la familia puede deshacerlos.
  // Gastos normales: solo quien los registró.
  if (!isCashMovement && !isOwner) {
    throw new Error("Solo puedes eliminar movimientos que registraste tú.");
  }

  const now = new Date().toISOString();
  const deactivateIds: string[] = [expense.id];

  if (expense.transfer_group_id) {
    const { data: transferRows, error: transferError } = await admin
      .from("expenses")
      .select("id")
      .eq("family_id", profile.family_id)
      .eq("transfer_group_id", expense.transfer_group_id)
      .eq("is_active", true);

    if (transferError) throw new Error(transferError.message);
    for (const row of transferRows ?? []) {
      if (!deactivateIds.includes(row.id)) deactivateIds.push(row.id);
    }
  }

  const { data: updated, error } = await admin
    .from("expenses")
    .update({
      is_active: false,
      updated_at: now,
      updated_by: user.id,
    } as never)
    .in("id", deactivateIds)
    .eq("family_id", profile.family_id)
    .eq("is_active", true)
    .select("id");

  if (error) throw new Error(error.message);
  if (!updated?.length) {
    throw new Error("No se pudo eliminar el movimiento.");
  }

  // If this was a fixed-expense payment row, reopen the checklist item.
  const { error: paymentError } = await admin
    .from("fixed_expense_payments")
    .update({
      status: "pending",
      real_value: null,
      paid_at: null,
      paid_by: null,
      expense_id: null,
      updated_at: now,
    } as never)
    .in("expense_id", deactivateIds);

  // Table may not exist yet in older environments.
  if (paymentError && !/fixed_expense_payments|schema cache|does not exist/i.test(paymentError.message)) {
    throw new Error(paymentError.message);
  }

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/fixed-expenses");

  return { success: true };
}
