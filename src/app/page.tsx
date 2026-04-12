export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { calculateDebt } from "@/app/actions/debt";
import DashboardCouple from "@/components/DashboardCouple";
import DashboardSolo from "@/components/DashboardSolo";
import FAB from "@/components/FAB";
import { getDashboardData } from "@/lib/dashboard";
import type { ExpenseSplitType } from "@/lib/expenses";
import { createClient } from "@/utils/supabase/server";



interface ExpenseRow {
  id: string;
  amount: number;
  concept: string;
  paid_by: string;
  family_id: string;
  split_type: ExpenseSplitType;
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

function sumVisibleExpenses(expenses: ExpenseRow[]) {
  const total = expenses.reduce((sum, expense) => {
    const amount = Number(expense.amount);

    if (expense.split_type === "settlement") {
      return sum;
    }

    if (expense.split_type === "personal") {
      return sum + amount;
    }

    return sum + amount * (Number(expense.payer_share_pct ?? 50) / 100);
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
    .maybeSingle();

  const familyId = profile?.family_id ?? null;

  const familyCountQuery = familyId
    ? await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("family_id", familyId)
    : { count: 1 };

  const familyMemberCount = familyCountQuery.count ?? 1;
  const dashboard = await getDashboardData();
  const currentMember = dashboard.members.find((member) => member.id === user.id);
  const currentUserName =
    profile?.full_name?.trim() ||
    currentMember?.name ||
    user.email?.split("@")[0] ||
    "Usuario";
  const avatarUrl = profile?.avatar_url ?? currentMember?.avatarUrl ?? null;

  let coupleExpenses: ExpenseRow[] = [];
  let mySpent = 0;
  let partnerSpent = 0;
  let debt = { deudorId: null as string | null, acreedorId: null as string | null, monto: 0 };

  if (familyMemberCount >= 2 && familyId) {
    console.log("--- DEBUG SERVER: OBTENIENDO GASTOS ---");
    console.log("Buscando para familyId:", familyId);

    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select("*, profiles!expenses_paid_by_fkey(full_name, avatar_url)")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false });

    if (expensesError) {
      console.error("❌ ERROR SQL en Expenses:", expensesError);
    } else {
      console.log("✅ Gastos encontrados:", expenses?.length || 0);
    }
    console.log("-----------------------------------------");

    const debtResult = await calculateDebt(familyId);

    coupleExpenses = normalizeExpenses((expenses ?? []) as RawExpenseRow[]);
    mySpent = sumVisibleExpenses(coupleExpenses.filter((expense) => expense.paid_by === user.id));
    partnerSpent = sumVisibleExpenses(coupleExpenses.filter((expense) => expense.paid_by !== user.id));
    debt = {
      deudorId: debtResult.deudor_id,
      acreedorId: debtResult.acreedor_id,
      monto: debtResult.monto,
    };
  }

  return (
    <>
      {familyMemberCount >= 2 && familyId ? (
        <DashboardCouple
          familyId={familyId}
          currentUserId={user.id}
          familyName={dashboard.familyName}
          currentUserName={currentUserName}
          members={dashboard.members}
          expenses={coupleExpenses}
          mySpent={mySpent}
          partnerSpent={partnerSpent}
          debt={debt}
        />
      ) : (
        <DashboardSolo
          userName={currentUserName}
          avatarUrl={avatarUrl}
          budget={dashboard.budget}
          transactions={dashboard.transactions}
        />
      )}
      <FAB />
    </>
  );
}
