"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

interface SettleP2PInput {
  payerId: string;
  receiverId: string;
  expenseIds: string[];
  totalAmount: number;
  familyId: string;
}

export async function settleP2PAction({ payerId, receiverId, expenseIds, totalAmount, familyId }: SettleP2PInput) {
  const admin = getSupabaseAdminClient();

  // 1. Marcar los gastos como liquidados
  const { error: updateError } = await admin
    .from("expenses")
    .update({ is_settled: true })
    .in("id", expenseIds);

  if (updateError) {
    throw new Error("Error al actualizar gastos: " + updateError.message);
  }

  // 2. Insertar la transferencia P2P
  const { error: insertError } = await admin.from("expenses").insert({
    family_id: familyId,
    paid_by: payerId,
    responsible_for: receiverId,
    category: "transfer",
    concept: "Liquidación P2P",
    amount: Number(totalAmount.toFixed(2)),
    is_settled: true,
    split_type: "shared_custom",
    expense_date: new Date().toISOString().slice(0, 10),
    payer_share_pct: 100,
  } as never);

  if (insertError) {
    throw new Error("Error al registrar la transferencia: " + insertError.message);
  }

  revalidatePath("/");
  return { success: true };
}
