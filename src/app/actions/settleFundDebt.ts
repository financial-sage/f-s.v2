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

  // 2. Registrar la compensación contable: salida del fondo + reembolso al usuario
  const settlementDate = new Date().toISOString().slice(0, 10);
  const { error: insertError } = await admin.from("expenses").insert([
    {
      family_id: familyId,
      category: "withdrawal",
      concept: "Liquidación de deuda",
      amount: Number(totalAmount.toFixed(2)),
      paid_by: currentUserId,
      responsible_for: "joint_fund",
      is_settled: true,
      expense_date: settlementDate,
      split_type: "shared_custom",
      payer_share_pct: 100,
    },
    {
      family_id: familyId,
      category: "deposit",
      concept: "Reembolso del fondo",
      amount: Number(totalAmount.toFixed(2)),
      paid_by: currentUserId,
      responsible_for: currentUserId,
      is_settled: true,
      expense_date: settlementDate,
      split_type: "personal",
      payer_share_pct: 100,
    },
  ] as never);

  if (insertError) {
    throw new Error("Error al registrar la liquidación: " + insertError.message);
  }

  revalidatePath("/");
  revalidatePath("/history");

  return { success: true };
}
