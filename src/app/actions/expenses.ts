"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";
import type { ExpenseSplitType } from "@/lib/expenses";

export type ExpenseActor = "me" | "partner" | "joint_fund";
export type ExpenseResponsibleFor = "joint_fund" | "me" | "partner";
export type ExpenseCategory = "super" | "food" | "transport" | "home" | "other" | "deposit";

interface SaveExpenseInput {
  amount: number;
  concept: string;
  paidBy: ExpenseActor;
  responsibleFor: ExpenseResponsibleFor;
  payerSharePct: number;
  category: ExpenseCategory;
  date: string;
  splitTypeOverride?: ExpenseSplitType;
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

  const paidByValue = resolveActor(paidBy, user.id, partnerUserId);
  const responsibleForValue =
    responsibleFor === "joint_fund"
      ? "joint_fund"
      : resolveActor(responsibleFor, user.id, partnerUserId);
  const normalizedPayerSharePct = Math.max(0, Math.min(100, Number(payerSharePct)));
  const inferredSplitType: ExpenseSplitType =
    responsibleFor === "joint_fund"
      ? normalizedPayerSharePct === 50
        ? "shared_equal"
        : "shared_custom"
      : "personal";
  const splitType = splitTypeOverride ?? inferredSplitType;
  const payerSharePctToStore = splitType.includes("shared")
    ? normalizedPayerSharePct
    : splitType === "fund_transfer"
      ? 100
      : 100;

  const payload = {
    family_id: profile.family_id,
    amount: Number(normalizedAmount.toFixed(2)),
    concept: normalizedConcept,
    paid_by: paidByValue,
    responsible_for: responsibleForValue,
    category,
    expense_date: date,
    split_type: splitType,
    payer_share_pct: payerSharePctToStore,
  };

  let { error: insertError } = await admin.from("expenses").insert(payload as never);

  if (insertError && /invalid input value for enum/i.test(insertError.message) && splitType === "fund_transfer") {
    ({ error: insertError } = await admin.from("expenses").insert(
      {
        ...payload,
        split_type: "shared_custom",
        payer_share_pct: 0,
      } as never
    ));
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
}: {
  amount: number;
  date?: string;
}) {
  const normalizedAmount = Number(amount);

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("Ingresa un importe válido.");
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
    throw new Error("Debes pertenecer a una familia para guardar aportes.");
  }

  const payload = {
    family_id: profile.family_id,
    amount: Number(normalizedAmount.toFixed(2)),
    concept: "Aporte al Fondo Común",
    category: "deposit" as ExpenseCategory,
    split_type: "fund_transfer" as ExpenseSplitType,
    responsible_for: "joint_fund",
    paid_by: user.id,
    payer_share_pct: 100,
    expense_date: date ?? new Date().toISOString().slice(0, 10),
  };

  let { error: insertError } = await admin.from("expenses").insert(payload as never);

  if (insertError && /invalid input value for enum/i.test(insertError.message)) {
    ({ error: insertError } = await admin.from("expenses").insert(
      {
        ...payload,
        split_type: "shared_custom",
        payer_share_pct: 0,
      } as never
    ));
  }

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath("/");
  revalidatePath("/history");

  return { success: true };
}
