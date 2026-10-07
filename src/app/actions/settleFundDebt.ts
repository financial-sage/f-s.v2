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
  fundId: string;
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
  const personalFund = getPersonalFund(funds, currentUserId);

  if (!fundId) {
    throw new Error("Debes indicar el bolsillo a cobrar.");
  }

  const sharedFund = funds.find((f) => f.id === fundId && f.scope === "shared" && !f.archived_at);
  if (!sharedFund) {
    throw new Error("Fondo compartido no encontrado.");
  }

  const { data: targetExpenses, error: loadError } = await admin
    .from("expenses")
    .select("id, fund_id, responsible_for, paid_by, is_settled, paid_from_fund, category")
    .eq("family_id", familyId)
    .in("id", expenseIds);

  if (loadError) {
    throw new Error("Error al cargar gastos: " + loadError.message);
  }

  const defaultShared = getDefaultSharedFund(funds);
  const invalid = (targetExpenses ?? []).some((expense) => {
    if (expense.paid_by !== currentUserId) return true;
    if (expense.is_settled) return true;
    if (expense.paid_from_fund) return true;
    if (expense.category === "deposit" || expense.category === "withdrawal") return true;
    if (expense.fund_id) return expense.fund_id !== sharedFund.id;
    // Legacy rows without fund_id only settle against the default shared fund
    return !(
      sharedFund.id === defaultShared?.id &&
      (expense.responsible_for === "joint_fund" ||
        expense.responsible_for === "fondo_comun" ||
        expense.responsible_for === "shared" ||
        expense.responsible_for === "compartido")
    );
  });

  if (invalid || (targetExpenses ?? []).length !== expenseIds.length) {
    throw new Error("Hay gastos que no pertenecen a este bolsillo.");
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
      concept: "Liquidación de deuda",
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
