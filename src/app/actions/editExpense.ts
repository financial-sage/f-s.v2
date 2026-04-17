"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";

export async function editExpenseAction(
  originalId: string,
  newAmount: number,
  newConcept: string
) {
  const normalizedAmount = Number(newAmount);
  const normalizedConcept = newConcept.trim();

  if (!originalId) {
    throw new Error("No se encontró el gasto original.");
  }

  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    throw new Error("Ingresa un monto válido.");
  }

  if (!normalizedConcept) {
    throw new Error("Ingresa un concepto válido.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("edit_expense_immutable", {
    p_original_id: originalId,
    p_new_amount: Number(normalizedAmount.toFixed(2)),
    p_new_concept: normalizedConcept,
  });

  if (error) {
    throw new Error("Error en la transacción inmutable: " + error.message);
  }

  revalidatePath("/");
  revalidatePath("/history");

  return { success: true, data };
}
