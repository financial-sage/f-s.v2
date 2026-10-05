"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ensureFamilyFunds } from "@/app/actions/funds";
import { getDefaultSharedFund, getPersonalFund } from "@/lib/funds";

interface SettleFundDebtInput {
  expenseIds: string[];
  totalAmount: number;
  currentUserId: string;
  familyId: string;
  fundId?: string;
}

export async function settleFundDebtAction({
  expenseIds,
  totalAmount,
  currentUserId,
  familyId,
  fundId,
}: SettleFundDebtInput) {
  const admin = getSupabaseAdminClient();
  const funds = await ensureFamilyFunds(familyId);
  const sharedFund =
    (fundId ? funds.find((f) => f.id === fundId) : null) ?? getDefaultSharedFund(funds);
  const personalFund = getPersonalFund(funds, currentUserId);

  if (!sharedFund || sharedFund.scope !== "shared") {
    throw new Error("Fondo compartido no encontrado.");
  }

  const { error: updateError } = await admin
    .from("expenses")
    .update({ is_settled: true })
    .in("id", expenseIds);

  if (updateError) {
    throw new Error("Error al actualizar gastos: " + updateError.message);
  }

  const settlementDate = new Date().toISOString().slice(0, 10);
  const amount = Number(totalAmount.toFixed(2));

  const { error: insertError } = await admin.from("expenses").insert([
    {
      family_id: familyId,
      category: "withdrawal",
      concept: `Liquidación de deuda (${sharedFund.name})`,
      amount,
      paid_by: currentUserId,
      responsible_for: "joint_fund",
      is_settled: true,
      expense_date: settlementDate,
      split_type: "shared_custom",
      payer_share_pct: 100,
      fund_id: sharedFund.id,
      paid_from_fund: true,
    },
    {
      family_id: familyId,
      category: "deposit",
      concept: "Reembolso del fondo",
      amount,
      paid_by: currentUserId,
      responsible_for: currentUserId,
      is_settled: true,
      expense_date: settlementDate,
      split_type: "personal",
      payer_share_pct: 100,
      fund_id: personalFund?.id ?? null,
      paid_from_fund: false,
    },
  ] as never);

  if (insertError) {
    throw new Error("Error al registrar la liquidación: " + insertError.message);
  }

  revalidatePath("/");
  revalidatePath("/history");

  return { success: true };
}
