export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { calculateDebt } from "@/app/actions/debt";
import DashboardCouple from "@/components/DashboardCouple";
import DashboardSolo from "@/components/DashboardSolo";
import FAB from "@/components/FAB";
import { filterExpensesForPrivacy, getDashboardData } from "@/lib/dashboard";
import type { ExpenseSplitType } from "@/lib/expenses";
import { createClient } from "@/utils/supabase/server";



interface ExpenseRow {
  id: string;
  amount: number;
  concept: string;
  paid_by: string;
  family_id: string;
  split_type: ExpenseSplitType;
  responsible_for?: string | null;
  category?: string | null;
  payer_share_pct: number;
  profiles:
    | {
        full_name: string | null;
        avatar_url: string | null;
      }
    | null;
  expense_date: string;
  created_at: string;
}

interface RawExpenseRow extends Omit<ExpenseRow, "profiles"> {
  profiles:
    | {
        full_name: string | null;
        avatar_url: string | null;
      }[]
    | null;
}

function normalizeExpenses(rows: RawExpenseRow[]): ExpenseRow[] {
  return rows.map((row) => ({
    ...row,
    profiles: Array.isArray(row.profiles) ? (row.profiles[0] ?? null) : row.profiles,
  }));
}

function getFirstName(value?: string | null, fallback = "Mi pareja") {
  const firstName = value?.trim().split(/\s+/)[0];
  return firstName || fallback;
}

function formatRelativeDate(dateInput: string) {
  const date = new Date(dateInput);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";

  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
  })
    .format(date)
    .replace(".", "");
}

function sumMemberShare(expenses: ExpenseRow[], memberId: string) {
  const total = expenses.reduce((sum, expense) => {
    const amount = Number(expense.amount);
    const splitType = expense.split_type ?? "";

    if (splitType === "settlement") {
      return sum;
    }

    if (splitType === "personal") {
      return expense.paid_by === memberId ? sum + amount : sum;
    }

    if (splitType.includes("shared")) {
      const payerPct = Number(expense.payer_share_pct ?? 50);
      const payerShare = amount * (payerPct / 100);
      const partnerShare = amount - payerShare;
      return expense.paid_by === memberId ? sum + payerShare : sum + partnerShare;
    }

    return sum;
  }, 0);

  return Math.round(total * 100) / 100;
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) {
    redirect("/onboarding");
  }

  const familyId = profile.family_id;

  const { data: family } = await supabase
    .from("families")
    .select("user_1_id, user_2_id, financial_model")
    .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
    .maybeSingle();

  const resolvedPartnerId =
    family?.user_1_id === user.id ? family.user_2_id : family?.user_1_id ?? null;

  const { data: partnerProfile } = resolvedPartnerId
    ? await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", resolvedPartnerId)
        .maybeSingle()
    : { data: null };

  const familyCountQuery = familyId
    ? await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("family_id", familyId)
    : { count: 1 };

  const familyMemberCount = familyCountQuery.count ?? 1;
  const dashboard = await getDashboardData();
  const currentMember = dashboard.members.find((member) => member.id === user.id);
  const partnerFirstName = getFirstName(
    partnerProfile?.full_name ?? dashboard.members.find((member) => member.id !== user.id)?.name,
    "Mi pareja"
  );
  const currentUserName =
    profile?.full_name?.trim() ||
    currentMember?.name ||
    user.email?.split("@")[0] ||
    "Usuario";
  const avatarUrl = profile?.avatar_url ?? currentMember?.avatarUrl ?? null;

  let coupleExpenses: ExpenseRow[] = [];
  let mySpent = 0;
  let partnerSpent = 0;
  let fundBalance = 0;
  let personalBalance = 0;

  if (familyMemberCount >= 2 && familyId) {
    console.log("--- DEBUG SERVER: OBTENIENDO GASTOS ---");
    console.log("Buscando para familyId:", familyId);

    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select("*, profiles!expenses_paid_by_fkey(full_name, avatar_url)")
      .eq("family_id", familyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const debtResult = await calculateDebt(familyId, user.id);

    const rawCoupleExpenses = normalizeExpenses((expenses ?? []) as RawExpenseRow[]);
    coupleExpenses = filterExpensesForPrivacy(rawCoupleExpenses, user.id);
    const partnerId = dashboard.members.find((member) => member.id !== user.id)?.id ?? null;
    mySpent = sumMemberShare(coupleExpenses, user.id);
    partnerSpent = partnerId ? sumMemberShare(coupleExpenses, partnerId) : 0;
    fundBalance = debtResult.fundBalance;
    personalBalance = debtResult.personalBalance;
  }

  return (
    <>
      {familyMemberCount >= 2 && familyId ? (
        <DashboardCouple
          familyId={familyId}
          currentUserId={user.id}
          familyName={dashboard.familyName}
          currentUserName={currentUserName}
          partnerFirstName={partnerFirstName}
          members={dashboard.members}
          expenses={coupleExpenses}
          mySpent={mySpent}
          partnerSpent={partnerSpent}
          fundBalance={fundBalance}
          personalBalance={personalBalance}
          financialModel={family?.financial_model ?? "joint_fund"}
        />
      ) : (
        <DashboardSolo
          currentUserId={user.id}
          familyId={familyId}
          userName={currentUserName}
          avatarUrl={avatarUrl}
          budget={dashboard.budget}
          transactions={dashboard.transactions}
        />
      )}
      {/* <FAB /> */}
    </>
  );
}
