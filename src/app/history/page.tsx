export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { filterExpensesForPrivacy } from "@/lib/dashboard";
import type { ExpenseSplitType } from "@/lib/expenses";
import HistoryList, { type HistoryExpenseRow } from "@/components/HistoryList";
import StoreHydrator from "@/components/StoreHydrator";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExpenseRow {
  id: string;
  amount: number;
  concept: string;
  paid_by: string;
  responsible_for?: string | null;
  category?: string | null;
  split_type: ExpenseSplitType;
  expense_date: string;
  created_at: string;
  is_settled?: boolean;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) redirect("/onboarding");

  const [familyProfilesResult, familyResult, rawExpensesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("family_id", profile.family_id),
    supabase
      .from("families")
      .select("financial_model")
      .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
      .maybeSingle(),
    supabase
      .from("expenses")
      .select("id, amount, concept, paid_by, responsible_for, category, split_type, expense_date, created_at, is_settled")
      .eq("family_id", profile.family_id)
      .eq("is_active", true)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const familyProfiles = familyProfilesResult.data ?? [];
  const financialModel = familyResult.data?.financial_model ?? "joint_fund";
  const partner = familyProfiles.find((p) => p.id !== user.id);
  const partnerName = partner?.full_name?.trim().split(/\s+/)[0] ?? "Pareja";
  const partnerId = partner?.id ?? null;

  const allVisibleExpenses = filterExpensesForPrivacy(
    (rawExpensesResult.data ?? []) as ExpenseRow[],
    user.id
  ) as HistoryExpenseRow[];

  return (
    <div className="flex flex-col h-dvh bg-slate-50 overflow-hidden">
      <StoreHydrator userId={user.id} />
      {/* Header */}
      <header className="shrink-0 z-10 flex items-center gap-3 bg-[#F8F9FA]/90 px-4 py-4 backdrop-blur-md border-b border-slate-100">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm text-slate-500 transition hover:text-slate-800"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-bold tracking-tight text-slate-800">Historial de Movimientos</h1>
      </header>

      {/* Interactive list with balance header and filters (client component) */}
      <HistoryList
        allExpenses={allVisibleExpenses}
        currentUserId={user.id}
        partnerName={partnerName}
        partnerId={partnerId}
        financialModel={financialModel}
      />
    </div>
  );
}
