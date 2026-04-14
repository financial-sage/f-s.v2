"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/server";


interface SettleFundDebtInput {
  expenseIds: string[];
  totalAmount: number;
  currentUserId: string;
  familyId: string;
}

export async function settleFundDebtAction({ expenseIds, totalAmount, currentUserId, familyId }: SettleFundDebtInput) {
  const admin = getSupabaseAdminClient();

  // 1. Marcar los gastos como liquidados
  const { error: updateError } = await admin
    .from("expenses")
    .update({ is_settled: true })
    .in("id", expenseIds);

  if (updateError) {
    throw new Error("Error al actualizar gastos: " + updateError.message);
  }

  // 2. Insertar el retiro en el fondo
  const { error: insertError } = await admin.from("expenses").insert({
    family_id: familyId,
    category: "withdrawal",
    concept: "Liquidación de deuda",
    amount: Number(totalAmount.toFixed(2)),
    paid_by: currentUserId, // UUID válido
    responsible_for: "joint_fund", // String válido
    is_settled: true,
    expense_date: new Date().toISOString().slice(0, 10),
    split_type: "shared_custom",
    payer_share_pct: 100,
  } as never);

  if (insertError) {
    throw new Error("Error al registrar el retiro: " + insertError.message);
  }

  revalidatePath("/");
  revalidatePath("/history");

  return { success: true };
}
