export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { filterExpensesForPrivacy } from "@/lib/dashboard";
import BudgetManager from "@/components/BudgetManager";
import StoreHydrator from "@/components/StoreHydrator";
import type { BudgetExpenseRow } from "@/lib/budgetSpending";

interface ExpenseRow {
  amount: number;
  category?: string | null;
  expense_date?: string | null;
  created_at: string;
  concept?: string | null;
  paid_by: string;
  responsible_for?: string | null;
}

export default async function BudgetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) redirect("/onboarding");

  const { data: rawExpenses } = await supabase
    .from("expenses")
    .select("amount, category, expense_date, created_at, concept, paid_by, responsible_for")
    .eq("family_id", profile.family_id)
    .eq("is_active", true)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  const visibleExpenses = filterExpensesForPrivacy(
    (rawExpenses ?? []) as ExpenseRow[],
    user.id,
  ) as BudgetExpenseRow[];

  return (
    <>
      <StoreHydrator userId={user.id} />
      <BudgetManager familyId={profile.family_id} initialExpenses={visibleExpenses} />
    </>
  );
}
