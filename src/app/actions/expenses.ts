"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";
import type { ExpenseSplitType } from "@/lib/expenses";

export type ExpenseActor = "me" | "partner" | "joint_fund";
export type ExpenseResponsibleFor = "joint_fund" | "me" | "partner";
export type ExpenseCategory = "super" | "food" | "transport" | "home" | "other";

interface SaveExpenseInput {
  amount: number;
  concept: string;
  paidBy: ExpenseActor;
  responsibleFor: ExpenseResponsibleFor;
  category: ExpenseCategory;
  date: string;
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
  category,
  date,
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
  const responsibleForValue = resolveActor(responsibleFor, user.id, partnerUserId);
  const splitType: ExpenseSplitType = responsibleFor === "joint_fund" ? "shared_equal" : "personal";
  const payerSharePct = responsibleFor === "joint_fund" ? 50 : 100;

  const { error: insertError } = await admin.from("expenses").insert({
    family_id: profile.family_id,
    amount: Number(normalizedAmount.toFixed(2)),
    concept: normalizedConcept,
    paid_by: paidByValue,
    responsible_for: responsibleForValue,
    category,
    expense_date: date,
    split_type: splitType,
    payer_share_pct: payerSharePct,
  } as never);

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath("/");
  revalidatePath("/add-expense");
  revalidatePath("/history");

  return { success: true };
}
