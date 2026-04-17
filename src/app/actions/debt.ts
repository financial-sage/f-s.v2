"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

interface ExpenseRow {
  amount: number;
  paid_by: string;
  split_type: string;
  responsible_for?: string | null;
  payer_share_pct?: number;
  category?: string | null;
  concept?: string;
}

export async function calculateDebt(family_id: string, current_user_id: string) {
  if (!family_id || !current_user_id) {
    return { fundBalance: 0, personalBalance: 0 };
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
        .select("amount, paid_by, split_type, responsible_for, payer_share_pct, category, concept")
        .eq("family_id", family_id)
        .eq("is_active", true),
    ]);

  if (familyError || expensesError || !family?.user_1_id || !family?.user_2_id) {
    return { fundBalance: 0, personalBalance: 0 };
  }

  const partnerId =
    current_user_id === family.user_1_id ? family.user_2_id : family.user_1_id;
  const rows = (expenses ?? []) as ExpenseRow[];

  const fundBalance = rows.reduce((sum, row) => {
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return sum;
    }

    if (row.split_type.includes("shared")) {
      const payerSharePct = Number(row.payer_share_pct ?? 50);
      const fundCredit = amount * ((100 - payerSharePct) / 100);

      if (row.paid_by === current_user_id) {
        return sum + fundCredit;
      }

      if (row.paid_by === partnerId) {
        return sum - fundCredit;
      }

      return sum;
    }

    if (row.split_type === "fund_transfer") {
      if (row.paid_by === current_user_id) {
        return sum + amount;
      }

      if (row.paid_by === partnerId) {
        return sum - amount;
      }
    }

    return sum;
  }, 0);

  const personalBalance = rows.reduce((sum, row) => {
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return sum;
    }

    if (row.responsible_for === partnerId && row.paid_by === current_user_id) {
      return sum + amount;
    }

    if (row.responsible_for === current_user_id && row.paid_by === partnerId) {
      return sum - amount;
    }

    return sum;
  }, 0);

  return {
    fundBalance: Math.round(fundBalance * 100) / 100,
    personalBalance: Math.round(personalBalance * 100) / 100,
  };
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
