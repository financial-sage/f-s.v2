"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

interface ExpenseRow {
  amount: number;
  paid_by: string;
  split_type: string;
  concept?: string;
}

export async function calculateDebt(family_id: string) {
  if (!family_id) {
    return { deudor_id: null, acreedor_id: null, monto: 0 };
  }

  const supabase = await createClient();

  const [{ data: family, error: familyError }, { data: expenses, error: expensesError }] =
    await Promise.all([
      supabase
        .from("families")
        .select("user_1_id, user_2_id")
        .eq("id", family_id)
        .maybeSingle(),
      supabase
        .from("expenses")
        .select("amount, paid_by, split_type, concept")
        .eq("family_id", family_id),
    ]);

  if (familyError || expensesError || !family?.user_1_id || !family?.user_2_id) {
    return { deudor_id: null, acreedor_id: null, monto: 0 };
  }

  const userA = { id: family.user_1_id };
  const userB = { id: family.user_2_id };
  const rows = (expenses ?? []) as ExpenseRow[];

  const sharedRows = rows.filter((row) =>
    ["shared", "shared_equal"].includes(row.split_type)
  );

  const settlementRows = rows.filter((row) => {
    const concept = row.concept?.trim().toLowerCase() ?? "";
    return row.split_type === "settlement" || concept === "liquidación" || concept === "liquidacion";
  });

  const paidByUserA = sharedRows
    .filter((row) => row.paid_by === userA.id)
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const paidByUserB = sharedRows
    .filter((row) => row.paid_by === userB.id)
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const settlementsByUserA = settlementRows
    .filter((row) => row.paid_by === userA.id)
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const settlementsByUserB = settlementRows
    .filter((row) => row.paid_by === userB.id)
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const net = (paidByUserA - paidByUserB) / 2 + settlementsByUserA - settlementsByUserB;
  const monto = Math.round(Math.abs(net) * 100) / 100;

  if (monto === 0) {
    return { deudor_id: null, acreedor_id: null, monto: 0 };
  }

  return net > 0
    ? { deudor_id: userB.id, acreedor_id: userA.id, monto }
    : { deudor_id: userA.id, acreedor_id: userB.id, monto };
}

export async function settleDebt({
  deudor_id,
  acreedor_id,
  monto,
  family_id,
}: {
  deudor_id: string;
  acreedor_id: string;
  monto: number;
  family_id: string;
}) {
  if (!deudor_id || !acreedor_id || !family_id || !monto || monto <= 0) {
    return;
  }

  const supabase = await createClient();
  const payload = {
    family_id,
    paid_by: deudor_id,
    amount: Number(monto.toFixed(2)),
    concept: "Liquidación",
    split_type: "settlement",
    payer_share_pct: 100,
    expense_date: new Date().toISOString().slice(0, 10),
  };

  let { error } = await supabase.from("expenses").insert(payload as never);

  if (error && /invalid input value for enum/i.test(error.message)) {
    ({ error } = await supabase
      .from("expenses")
      .insert({ ...payload, split_type: "shared_custom" } as never));
  }

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/");
}
