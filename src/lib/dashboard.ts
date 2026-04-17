import type { ExpenseSplitType } from "@/lib/expenses";
import { createClient } from "@/utils/supabase/server";

interface UserRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface FamilyRow {
  id: string;
  name: string | null;
  user_1_id: string;
  user_2_id: string | null;
}

interface ExpenseRow {
  id: string;
  amount: number;
  concept: string;
  paid_by: string;
  split_type: ExpenseSplitType;
  payer_share_pct: number;
  expense_date: string;
  created_at: string;
}

export interface DashboardMember {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface DashboardDebt {
  amount: number;
  debtorName: string | null;
  creditorName: string | null;
  isSettled: boolean;
  syncedLabel: string;
}

export interface DashboardBudget {
  spent: number;
  budget: number;
  available: number;
  dailyAverage: number;
  monthLabel: string;
}

export interface DashboardTransaction {
  id: string;
  concept: string;
  tag: string;
  dateLabel: string;
  amount: number;
  status: string;
  isShared: boolean;
  iconKey: "shopping-cart" | "coffee" | "car" | "utensils" | "receipt";
}

export interface DashboardData {
  familyName: string;
  members: DashboardMember[];
  debt: DashboardDebt;
  budget: DashboardBudget;
  transactions: DashboardTransaction[];
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

function formatSyncLabel(lastCreatedAt?: string) {
  if (!lastCreatedAt) {
    return "Sin movimientos aún";
  }

  const diffMs = Date.now() - new Date(lastCreatedAt).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));

  if (diffMinutes < 60) {
    return `Sincronizado hace ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Sincronizado hace ${diffHours} h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Sincronizado hace ${diffDays} día${diffDays === 1 ? "" : "s"}`;
}

function getExpenseIconKey(concept: string): DashboardTransaction["iconKey"] {
  const normalized = concept.toLowerCase();

  if (/super|market|compra|grocery/.test(normalized)) return "shopping-cart";
  if (/cafe|café|coffee/.test(normalized)) return "coffee";
  if (/gas|gasolina|uber|taxi|auto|car/.test(normalized)) return "car";
  if (/comida|rest|restaurant|almuerzo|cena/.test(normalized)) return "utensils";

  return "receipt";
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function calculateDebtSummary(
  expenses: ExpenseRow[],
  currentUserId: string,
  partnerUserId: string,
  membersById: Record<string, DashboardMember>
): DashboardDebt {
  let netForCurrentUser = 0;

  for (const expense of expenses) {
    const amount = Number(expense.amount);
    const payerShare = amount * (Number(expense.payer_share_pct) / 100);
    const otherShare = amount - payerShare;

    if (expense.paid_by === currentUserId) {
      netForCurrentUser += otherShare;
    } else if (expense.paid_by === partnerUserId) {
      netForCurrentUser -= otherShare;
    }
  }

  const amount = round2(Math.abs(netForCurrentUser));
  const currentUserName = membersById[currentUserId]?.name ?? "Tú";
  const partnerName = membersById[partnerUserId]?.name ?? "Tu pareja";

  if (amount === 0) {
    return {
      amount: 0,
      debtorName: null,
      creditorName: null,
      isSettled: true,
      syncedLabel: formatSyncLabel(expenses[0]?.created_at),
    };
  }

  return netForCurrentUser > 0
    ? {
        amount,
        debtorName: partnerName,
        creditorName: currentUserName,
        isSettled: false,
        syncedLabel: formatSyncLabel(expenses[0]?.created_at),
      }
    : {
        amount,
        debtorName: currentUserName,
        creditorName: partnerName,
        isSettled: false,
        syncedLabel: formatSyncLabel(expenses[0]?.created_at),
      };
}

function calculateBudget(expenses: ExpenseRow[]): DashboardBudget {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const monthlyExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.expense_date);
    return expenseDate.getMonth() === month && expenseDate.getFullYear() === year;
  });

  const spent = round2(
    monthlyExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  );

  const configuredBudget = Number(process.env.FINANCIAL_SAGE_MONTHLY_BUDGET ?? 2000);
  const budget = Number.isFinite(configuredBudget) && configuredBudget > 0
    ? configuredBudget
    : 2000;

  const daysElapsed = Math.max(1, now.getDate());

  return {
    spent,
    budget,
    available: round2(Math.max(budget - spent, 0)),
    dailyAverage: round2(spent / daysElapsed),
    monthLabel: new Intl.DateTimeFormat("es-ES", {
      month: "long",
      year: "numeric",
    }).format(now),
  };
}

function mapTransactions(
  expenses: ExpenseRow[],
  currentUserId: string
): DashboardTransaction[] {
  return expenses.slice(0, 5).map((expense) => {
    const isShared = expense.split_type !== "personal" || Number(expense.payer_share_pct) < 100;

    return {
      id: expense.id,
      concept: expense.concept,
      tag: isShared
        ? "Nuestro"
        : expense.paid_by === currentUserId
          ? "Mío"
          : "Pareja",
      dateLabel: formatRelativeDate(expense.expense_date),
      amount: Number(expense.amount),
      status: isShared ? "Compartido" : "Personal",
      isShared,
      iconKey: getExpenseIconKey(expense.concept),
    };
  });
}

function getFallbackData(): DashboardData {
  return {
    familyName: "Nuestra familia",
    members: [
      { id: "current", name: "Tú", avatarUrl: null },
      { id: "partner", name: "Pareja", avatarUrl: null },
    ],
    debt: {
      amount: 0,
      debtorName: null,
      creditorName: null,
      isSettled: true,
      syncedLabel: "Sin movimientos aún",
    },
    budget: {
      spent: 0,
      budget: 1000,
      available: 1000,
      dailyAverage: 0,
      monthLabel: new Intl.DateTimeFormat("es-ES", {
        month: "long",
        year: "numeric",
      }).format(new Date()),
    },
    transactions: [],
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return getFallbackData();
    }

    const { data: family, error: familyError } = await supabase
      .from("families")
      .select("id, name, user_1_id, user_2_id")
      .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
      .maybeSingle();

    if (familyError || !family?.id) {
      return getFallbackData();
    }

    const memberIds = [family.user_1_id, family.user_2_id].filter(Boolean) as string[];

    const [membersResult, expensesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", memberIds),
      supabase
        .from("expenses")
        .select("id, amount, concept, paid_by, split_type, payer_share_pct, expense_date, created_at")
        .eq("family_id", family.id)
        .eq("is_active", true)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (membersResult.error || expensesResult.error) {
      return getFallbackData();
    }

    const members = ((membersResult.data ?? []) as UserRow[]).map((member) => ({
      id: member.id,
      name: member.full_name?.trim() || "Sin nombre",
      avatarUrl: member.avatar_url,
    }));

    const membersById = Object.fromEntries(
      members.map((member) => [member.id, member])
    ) as Record<string, DashboardMember>;

    const partnerUserId = members.find((member) => member.id !== user.id)?.id ?? user.id;
    const safeExpenses = (expensesResult.data ?? []) as ExpenseRow[];

    return {
      familyName: family.name?.trim() || "Nuestra familia",
      members,
      debt: calculateDebtSummary(safeExpenses, user.id, partnerUserId, membersById),
      budget: calculateBudget(safeExpenses),
      transactions: mapTransactions(safeExpenses, user.id),
    };
  } catch {
    return getFallbackData();
  }
}
