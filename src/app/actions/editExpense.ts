"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";

export async function editExpenseAction(
  formDataOrId: FormData | string,
  newAmount?: number | string,
  newConcept?: string
) {
  const isFormDataPayload = formDataOrId instanceof FormData;
  const originalId = isFormDataPayload
    ? String(formDataOrId.get("id") ?? "").trim()
    : String(formDataOrId ?? "").trim();
  const amountRaw = isFormDataPayload
    ? String(formDataOrId.get("amount") ?? "").trim()
    : String(newAmount ?? "").trim();
  const conceptRaw = isFormDataPayload
    ? String(formDataOrId.get("concept") ?? "").trim()
    : String(newConcept ?? "").trim();
  const categoryRaw = isFormDataPayload ? String(formDataOrId.get("category") ?? "").trim() : "";
  const expenseDateRaw = isFormDataPayload
    ? String(formDataOrId.get("expense_date") ?? "").trim()
    : "";
  const paidByRaw = isFormDataPayload ? String(formDataOrId.get("paid_by") ?? "").trim() : "";
  const responsibleForRaw = isFormDataPayload
    ? String(formDataOrId.get("responsible_for") ?? "").trim()
    : "";

  const amountVal = Number.parseFloat(amountRaw.replace(/,/g, "."));

  if (!originalId) {
    return { error: "No se encontró el gasto original." };
  }

  if (Number.isNaN(amountVal) || amountVal <= 0) {
    return { error: "El importe debe ser mayor a 0." };
  }

  if (!conceptRaw) {
    return { error: "Ingresa un concepto válido." };
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { error: "No autorizado" };
  }

  const admin = getSupabaseAdminClient();
  const finalAmount = Number(amountVal.toFixed(2));

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("family_id")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profileError || !profile?.family_id) {
    return { error: "Debes pertenecer a una familia para editar gastos." };
  }

  const updatePayload: Record<string, string | number> = {
    amount: finalAmount,
    concept: conceptRaw,
    updated_by: session.user.id,
  };

  if (categoryRaw) {
    updatePayload.category = categoryRaw;
  }

  if (expenseDateRaw) {
    updatePayload.expense_date = expenseDateRaw;
  }

  if (paidByRaw) {
    updatePayload.paid_by = paidByRaw;
  }

  if (responsibleForRaw) {
    updatePayload.responsible_for = responsibleForRaw;
  }

  const { data, error } = await admin
    .from("expenses")
    .update(updatePayload as never)
    .eq("id", originalId)
    .eq("family_id", profile.family_id)
    .eq("is_active", true)
    .select("id, amount, concept, category, expense_date, paid_by, responsible_for")
    .maybeSingle();

  if (error) {
    return { error: "No se pudo actualizar el gasto: " + error.message };
  }

  if (!data) {
    return { error: "No se encontró el gasto activo para actualizar." };
  }

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/add-expense");

  return { success: true, data };
}
