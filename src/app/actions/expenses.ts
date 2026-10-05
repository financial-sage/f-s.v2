"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";
import type { ExpenseSplitType } from "@/lib/expenses";
import { ensureFamilyFunds, depositToFundAction } from "@/app/actions/funds";
import { getDefaultSharedFund, getPersonalFund } from "@/lib/funds";

export type ExpenseActor = "me" | "partner" | "joint_fund";
export type ExpenseResponsibleFor = "joint_fund" | "me" | "partner";
export type ExpenseCategory = string;

interface SaveExpenseInput {
  amount: number;
  concept: string;
  paidBy: ExpenseActor;
  responsibleFor: ExpenseResponsibleFor;
  payerSharePct: number;
  category: ExpenseCategory;
  date: string;
  splitTypeOverride?: ExpenseSplitType;
  /** Pocket this expense belongs to. Required for shared-fund allocation. */
  fundId?: string | null;
  /** True when cash leaves the fund pocket (paid from fund caja). */
  paidFromFund?: boolean;
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

export async function saveExpenseAction({
  amount,
  concept,
  paidBy,
  responsibleFor,
  payerSharePct,
  category,
  date,
  splitTypeOverride,
  fundId,
  paidFromFund,
}: SaveExpenseInput) {
  const normalizedAmount = Number(amount);
  const normalizedConcept = concept.trim();

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("Ingresa un importe válido.");
  }

  if (!normalizedConcept) {
    throw new Error("Escribe un concepto para el gasto.");
  }

  if (!date) {
    throw new Error("Selecciona una fecha válida.");
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

  let funds: Awaited<ReturnType<typeof ensureFamilyFunds>> = [];
  try {
    funds = await ensureFamilyFunds(profile.family_id);
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
    throw new Error("El fondo seleccionado no existe.");
  }
  if (fund?.scope === "personal" && fund.owner_profile_id !== user.id && responsibleFor !== "partner") {
    // partner personal fund only when explicitly charging partner
  }
  if (fund?.scope === "personal" && fund.owner_profile_id && fund.owner_profile_id !== user.id && fund.owner_profile_id !== partnerUserId) {
    throw new Error("No puedes imputar gastos al fondo personal de otra persona.");
  }

  const paidByValue = resolveActor(paidBy, user.id, partnerUserId);
  const responsibleForValue =
    fund?.scope === "shared" || responsibleFor === "joint_fund"
      ? "joint_fund"
      : resolveActor(responsibleFor, user.id, partnerUserId);

  const isPaidFromFund = paidFromFund === true || paidBy === "joint_fund";

  if (isPaidFromFund && fund?.scope !== "shared") {
    throw new Error("Solo se puede pagar desde la caja de un fondo compartido.");
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
    category,
    expense_date: date,
    split_type: splitType,
    payer_share_pct: splitType.includes("shared") ? normalizedPayerSharePct : 100,
    fund_id: resolvedFundId,
    paid_from_fund: isPaidFromFund,
  };

  let { error: insertError } = await admin.from("expenses").insert(payload as never);

  if (insertError && /invalid input value for enum/i.test(insertError.message) && splitType === "fund_transfer") {
    ({ error: insertError } = await admin.from("expenses").insert(
      {
        ...payload,
        split_type: "shared_custom",
        payer_share_pct: isPaidFromFund ? 0 : payload.payer_share_pct,
      } as never
    ));
  }

  // Columns may not exist yet if migration not applied — retry without fund fields
  if (insertError && /fund_id|paid_from_fund|column/i.test(insertError.message)) {
    const { fund_id: _f, paid_from_fund: _p, ...legacyPayload } = payload;
    ({ error: insertError } = await admin.from("expenses").insert(legacyPayload as never));
  }

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath("/");
  revalidatePath("/add-expense");
  revalidatePath("/history");

  return { success: true };
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

    const funds = await ensureFamilyFunds(profile.family_id);
    const targetId = fundId ?? getDefaultSharedFund(funds)?.id;
    if (!targetId) throw new Error("No hay fondo común disponible.");

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

  const funds = await ensureFamilyFunds(profile.family_id);
  const personal = getPersonalFund(funds, user.id);
  if (!personal) throw new Error("No hay fondo personal disponible.");

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

  const { error } = await admin
    .from("expenses")
    .update({ is_active: false })
    .eq("id", expenseId)
    .eq("paid_by", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/history");

  return { success: true };
}
