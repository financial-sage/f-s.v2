"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { depositToFundAction, ensureFamilyFunds } from "@/app/actions/funds";
import { calculateFundCashBalance, getFixedExpensesFund } from "@/lib/funds";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  FixedExpenseMonthItem,
  FixedExpenseMonthSnapshot,
  FixedExpensePayment,
  FixedExpenseTemplate,
} from "@/lib/fixed-expenses/types";
import { getMonthKey } from "@/lib/budget";
import { createClient } from "@/utils/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

async function getUserFamilyId(userId: string) {
  const admin = getSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("family_id")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile?.family_id) {
    throw new Error("Debes pertenecer a una familia.");
  }

  return profile.family_id as string;
}

function mapTemplate(row: Record<string, unknown>): FixedExpenseTemplate {
  return {
    id: String(row.id),
    family_id: String(row.family_id),
    name: String(row.name),
    base_value: Number(row.base_value ?? 0),
    due_day: row.due_day == null ? null : Number(row.due_day),
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapPayment(row: Record<string, unknown>): FixedExpensePayment {
  return {
    id: String(row.id),
    family_id: String(row.family_id),
    fixed_expense_id: String(row.fixed_expense_id),
    month_key: String(row.month_key),
    base_value_snapshot: Number(row.base_value_snapshot ?? 0),
    real_value: row.real_value == null ? null : Number(row.real_value),
    status: row.status === "paid" ? "paid" : "pending",
    paid_at: row.paid_at == null ? null : String(row.paid_at),
    paid_by: row.paid_by == null ? null : String(row.paid_by),
    expense_id: row.expense_id == null ? null : String(row.expense_id),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function assertMonthKey(monthKey: string) {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    throw new Error("Mes inválido.");
  }
}

async function ensureMonthPayments(
  familyId: string,
  monthKey: string,
  templates: FixedExpenseTemplate[]
): Promise<FixedExpensePayment[]> {
  const admin = getSupabaseAdminClient();
  const active = templates.filter((t) => t.is_active);

  const { data: existingRows, error } = await admin
    .from("fixed_expense_payments")
    .select("*")
    .eq("family_id", familyId)
    .eq("month_key", monthKey);

  if (error) throw new Error(error.message);

  const existing = (existingRows ?? []).map((row) => mapPayment(row as Record<string, unknown>));
  const byTemplate = new Map(existing.map((p) => [p.fixed_expense_id, p]));

  const missing = active.filter((t) => !byTemplate.has(t.id));
  if (missing.length > 0) {
    const payload = missing.map((t) => ({
      family_id: familyId,
      fixed_expense_id: t.id,
      month_key: monthKey,
      base_value_snapshot: t.base_value,
      status: "pending",
    }));

    const { data: created, error: createError } = await admin
      .from("fixed_expense_payments")
      .insert(payload as never)
      .select("*");

    if (createError) throw new Error(createError.message);

    for (const row of created ?? []) {
      const payment = mapPayment(row as Record<string, unknown>);
      byTemplate.set(payment.fixed_expense_id, payment);
    }
  }

  return active
    .map((t) => byTemplate.get(t.id))
    .filter((p): p is FixedExpensePayment => Boolean(p));
}

export async function loadFixedExpensesMonthAction(
  monthKey: string
): Promise<FixedExpenseMonthSnapshot> {
  assertMonthKey(monthKey);
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const admin = getSupabaseAdminClient();

  const funds = await ensureFamilyFunds(familyId);
  const fixedFund = getFixedExpensesFund(funds);

  const { data: templateRows, error: templateError } = await admin
    .from("fixed_expenses")
    .select("*")
    .eq("family_id", familyId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (templateError) throw new Error(templateError.message);

  const templates = (templateRows ?? []).map((row) => mapTemplate(row as Record<string, unknown>));
  const payments = await ensureMonthPayments(familyId, monthKey, templates);
  const paymentByTemplate = new Map(payments.map((p) => [p.fixed_expense_id, p]));

  const items: FixedExpenseMonthItem[] = templates
    .map((template) => {
      const payment = paymentByTemplate.get(template.id);
      if (!payment) return null;
      return { template, payment };
    })
    .filter((item): item is FixedExpenseMonthItem => Boolean(item));

  const sumBase = items.reduce(
    (sum, item) => sum + Number(item.payment.base_value_snapshot || 0),
    0
  );

  let pocketDeposits = 0;
  let pocketAvailable = 0;
  if (fixedFund) {
    const { data: fundExpenses } = await admin
      .from("expenses")
      .select(
        "amount, category, concept, paid_by, responsible_for, fund_id, paid_from_fund, transfer_group_id, is_active, is_settled"
      )
      .eq("family_id", familyId)
      .eq("fund_id", fixedFund.id)
      .eq("is_active", true);

    const rows = (fundExpenses ?? []) as never[];
    pocketAvailable = calculateFundCashBalance(rows, fixedFund.id);
    pocketDeposits = rows
      .filter(
        (e: { category?: string | null; transfer_group_id?: string | null }) =>
          e.category === "deposit" && !e.transfer_group_id
      )
      .reduce((sum: number, e: { amount?: number }) => sum + Number(e.amount || 0), 0);
  }

  return {
    familyId,
    monthKey,
    budgetTotal: Math.round(sumBase * 100) / 100,
    pocketDeposits: Math.round(pocketDeposits * 100) / 100,
    pocketAvailable,
    items,
    fixedFundId: fixedFund?.id ?? null,
  };
}

export async function createFixedExpenseAction(input: {
  name: string;
  baseValue: number;
  dueDay?: number | null;
}): Promise<FixedExpenseTemplate> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const admin = getSupabaseAdminClient();

  const name = input.name.trim();
  const baseValue = Number(input.baseValue);

  if (!name) throw new Error("Escribe un nombre.");
  if (!Number.isFinite(baseValue) || baseValue < 0) {
    throw new Error("Ingresa un valor base válido.");
  }

  const dueDay =
    input.dueDay == null || Number.isNaN(Number(input.dueDay))
      ? null
      : Math.min(28, Math.max(1, Math.round(Number(input.dueDay))));

  const { data, error } = await admin
    .from("fixed_expenses")
    .insert({
      family_id: familyId,
      name,
      base_value: baseValue,
      due_day: dueDay,
      is_active: true,
      sort_order: 100,
    } as never)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/fixed-expenses");
  return mapTemplate(data as Record<string, unknown>);
}

export async function updateFixedExpenseAction(input: {
  id: string;
  name: string;
  baseValue: number;
  dueDay?: number | null;
}): Promise<FixedExpenseTemplate> {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const admin = getSupabaseAdminClient();

  const name = input.name.trim();
  const baseValue = Number(input.baseValue);

  if (!name) throw new Error("Escribe un nombre.");
  if (!Number.isFinite(baseValue) || baseValue < 0) {
    throw new Error("Ingresa un valor base válido.");
  }

  const dueDay =
    input.dueDay == null || Number.isNaN(Number(input.dueDay))
      ? null
      : Math.min(28, Math.max(1, Math.round(Number(input.dueDay))));

  const { data, error } = await admin
    .from("fixed_expenses")
    .update({
      name,
      base_value: baseValue,
      due_day: dueDay,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", input.id)
    .eq("family_id", familyId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/fixed-expenses");
  return mapTemplate(data as Record<string, unknown>);
}

export async function deactivateFixedExpenseAction(id: string) {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const admin = getSupabaseAdminClient();

  const { error } = await admin
    .from("fixed_expenses")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", id)
    .eq("family_id", familyId);

  if (error) throw new Error(error.message);

  revalidatePath("/fixed-expenses");
}

/** Real aporte to the fixed-expenses pocket (same as any other fund). */
export async function depositToFixedExpensesFundAction(amount: number) {
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const funds = await ensureFamilyFunds(familyId);
  const fixedFund = getFixedExpensesFund(funds);
  if (!fixedFund) {
    throw new Error(
      "Falta el bolsillo de Gastos fijos. Aplica la migración y recarga la app."
    );
  }

  await depositToFundAction({ fundId: fixedFund.id, amount });
  revalidatePath("/fixed-expenses");
  return { success: true as const, fundId: fixedFund.id };
}

export async function markFixedExpensePaidAction(input: {
  paymentId: string;
  realValue: number;
  monthKey: string;
}): Promise<FixedExpenseMonthSnapshot> {
  assertMonthKey(input.monthKey);
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const admin = getSupabaseAdminClient();
  const realValue = Number(input.realValue);

  if (!Number.isFinite(realValue) || realValue <= 0) {
    throw new Error("Ingresa el valor real pagado.");
  }

  const funds = await ensureFamilyFunds(familyId);
  const fixedFund = getFixedExpensesFund(funds);
  if (!fixedFund) {
    throw new Error(
      "Falta el bolsillo de Gastos fijos. Aplica la migración y recarga la app."
    );
  }

  const { data: paymentRow, error: paymentError } = await admin
    .from("fixed_expense_payments")
    .select("*, fixed_expenses(*)")
    .eq("id", input.paymentId)
    .eq("family_id", familyId)
    .maybeSingle();

  if (paymentError || !paymentRow) throw new Error("Pago no encontrado.");
  if (paymentRow.status === "paid") throw new Error("Este gasto ya está marcado como pagado.");

  const template = Array.isArray(paymentRow.fixed_expenses)
    ? paymentRow.fixed_expenses[0]
    : paymentRow.fixed_expenses;
  const concept = String(template?.name ?? "Gasto fijo");
  const todayKey = getMonthKey();
  const expenseDate =
    input.monthKey === todayKey
      ? new Date().toISOString().slice(0, 10)
      : `${input.monthKey}-15`;

  const { data: expense, error: expenseError } = await admin
    .from("expenses")
    .insert({
      family_id: familyId,
      paid_by: user.id,
      amount: realValue,
      concept,
      category: "fixed_expense",
      responsible_for: "joint_fund",
      split_type: "shared_equal",
      expense_date: expenseDate,
      created_by: user.id,
      updated_by: user.id,
      fund_id: fixedFund.id,
      paid_from_fund: true,
      is_settled: true,
      is_active: true,
    } as never)
    .select("id")
    .single();

  if (expenseError) throw new Error(expenseError.message);

  const { error: updateError } = await admin
    .from("fixed_expense_payments")
    .update({
      status: "paid",
      real_value: realValue,
      paid_at: new Date().toISOString(),
      paid_by: user.id,
      expense_id: expense.id,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", input.paymentId)
    .eq("family_id", familyId);

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/fixed-expenses");
  revalidatePath("/");
  revalidatePath("/history");

  return loadFixedExpensesMonthAction(input.monthKey);
}

export async function unmarkFixedExpensePaidAction(input: {
  paymentId: string;
  monthKey: string;
}): Promise<FixedExpenseMonthSnapshot> {
  assertMonthKey(input.monthKey);
  const user = await requireUser();
  const familyId = await getUserFamilyId(user.id);
  const admin = getSupabaseAdminClient();

  const { data: paymentRow, error: paymentError } = await admin
    .from("fixed_expense_payments")
    .select("*")
    .eq("id", input.paymentId)
    .eq("family_id", familyId)
    .maybeSingle();

  if (paymentError || !paymentRow) throw new Error("Pago no encontrado.");

  if (paymentRow.expense_id) {
    await admin
      .from("expenses")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      } as never)
      .eq("id", paymentRow.expense_id)
      .eq("family_id", familyId);
  }

  const { error: updateError } = await admin
    .from("fixed_expense_payments")
    .update({
      status: "pending",
      real_value: null,
      paid_at: null,
      paid_by: null,
      expense_id: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", input.paymentId)
    .eq("family_id", familyId);

  if (updateError) throw new Error(updateError.message);

  revalidatePath("/fixed-expenses");
  revalidatePath("/");
  revalidatePath("/history");

  return loadFixedExpensesMonthAction(input.monthKey);
}
