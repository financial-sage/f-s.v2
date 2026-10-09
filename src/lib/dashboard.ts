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
  responsible_for?: string | null;
  category?: string | null;
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

export function filterExpensesForPrivacy<
  T extends { paid_by: string; responsible_for?: string | null }
>(expenses: T[], currentUserId: string) {
  const sharedAliases = new Set(["joint_fund", "fondo_comun", "shared", "compartido"]);
  const partnerAliases = new Set(["partner", "pareja"]);

  return expenses.filter((expense) => {
    const responsibleForRaw = String(expense.responsible_for ?? "").trim();
    const responsibleFor = responsibleForRaw.toLowerCase();

    if (sharedAliases.has(responsibleFor)) {
      return true;
    }

    if (expense.paid_by === currentUserId) {
      return true;
    }

    if (expense.responsible_for === currentUserId) {
      return true;
    }

    if (partnerAliases.has(responsibleFor) && expense.paid_by !== currentUserId) {
      return true;
    }

    return false;
  });
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
      tag: isShared ? "Compartido" : "Personal",
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

interface BalanceExpenseRow {
  amount: number;
  paid_by: string;
  split_type: string;
  responsible_for?: string | null;
  payer_share_pct?: number;
  category?: string | null;
  concept?: string;
}

export interface HomeExpenseRow {
  id: string;
  amount: number;
  concept: string;
  paid_by: string;
  family_id: string;
  split_type: ExpenseSplitType;
  responsible_for?: string | null;
  category?: string | null;
  payer_share_pct: number;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  expense_date: string;
  created_at: string;
  is_settled?: boolean;
  fund_id?: string | null;
  paid_from_fund?: boolean | null;
  transfer_group_id?: string | null;
}

export interface HomePageData {
  userId: string;
  userEmail: string | null;
  familyId: string;
  familyMemberCount: number;
  financialModel: string;
  currentUserName: string;
  partnerFirstName: string;
  avatarUrl: string | null;
  dashboard: DashboardData;
  coupleExpenses: HomeExpenseRow[];
  mySpent: number;
  partnerSpent: number;
  fundBalance: number;
  personalBalance: number;
  /** Real personal pocket cash (deposits − spends), not budget remaining. */
  pocketBalance: number;
}

/** Same rules as Zustand `myAvailableFund`: personal deposits − paid spends. */
export function calculatePersonalPocketBalance(
  expenses: Array<{
    amount: number;
    paid_by: string;
    category?: string | null;
    responsible_for?: string | null;
  }>,
  userId: string,
) {
  const income = expenses
    .filter(
      (e) =>
        (e.category === "deposit" &&
          (e.responsible_for === userId || e.responsible_for === "mio")) ||
        (e.paid_by === userId && e.category === "withdrawal"),
    )
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const out = expenses
    .filter(
      (e) =>
        e.paid_by === userId &&
        e.category !== "deposit" &&
        e.category !== "withdrawal",
    )
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  return round2(income - out);
}

function sumMemberShare(expenses: HomeExpenseRow[], memberId: string) {
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

function calculateFundAndPersonalBalances(
  rows: BalanceExpenseRow[],
  currentUserId: string,
  partnerId: string,
) {
  const fundBalance = rows.reduce((sum, row) => {
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return sum;
    }

    if (row.split_type.includes("shared")) {
      const payerSharePct = Number(row.payer_share_pct ?? 50);
      const fundCredit = amount * ((100 - payerSharePct) / 100);

      if (row.paid_by === currentUserId) {
        return sum + fundCredit;
      }

      if (row.paid_by === partnerId) {
        return sum - fundCredit;
      }

      return sum;
    }

    if (row.split_type === "fund_transfer") {
      if (row.paid_by === currentUserId) {
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

    if (row.responsible_for === partnerId && row.paid_by === currentUserId) {
      return sum + amount;
    }

    if (row.responsible_for === currentUserId && row.paid_by === partnerId) {
      return sum - amount;
    }

    return sum;
  }, 0);

  return {
    fundBalance: Math.round(fundBalance * 100) / 100,
    personalBalance: Math.round(personalBalance * 100) / 100,
  };
}

function getFirstName(value?: string | null, fallback = "Mi pareja") {
  const firstName = value?.trim().split(/\s+/)[0];
  return firstName || fallback;
}

function buildDashboardFromParts(
  family: FamilyRow,
  userId: string,
  members: DashboardMember[],
  visibleExpenses: ExpenseRow[],
): DashboardData {
  const membersById = Object.fromEntries(
    members.map((member) => [member.id, member]),
  ) as Record<string, DashboardMember>;

  const partnerUserId = members.find((member) => member.id !== userId)?.id ?? userId;

  return {
    familyName: family.name?.trim() || "Nuestra familia",
    members,
    debt: calculateDebtSummary(visibleExpenses, userId, partnerUserId, membersById),
    budget: calculateBudget(visibleExpenses),
    transactions: mapTransactions(visibleExpenses, userId),
  };
}

/** Single home data path: one auth, one family, one expenses fetch. */
export async function getHomePageData(): Promise<
  | { ok: true; data: HomePageData }
  | { ok: false; reason: "unauthenticated" | "no_family" }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "unauthenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id, full_name, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) {
    return { ok: false, reason: "no_family" };
  }

  const familyId = profile.family_id;

  const [familyResult, membersResult, expensesResult] = await Promise.all([
    supabase
      .from("families")
      .select("id, name, user_1_id, user_2_id, financial_model")
      .or(`user_1_id.eq.${user.id},user_2_id.eq.${user.id}`)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("family_id", familyId),
    supabase
      .from("expenses")
      .select(
        "id, amount, concept, paid_by, family_id, split_type, responsible_for, category, payer_share_pct, expense_date, created_at, is_settled, fund_id, paid_from_fund, transfer_group_id, profiles!expenses_paid_by_fkey(full_name, avatar_url)",
      )
      .eq("family_id", familyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  const family = familyResult.data as (FamilyRow & { financial_model?: string | null }) | null;
  if (!family?.id) {
    return { ok: false, reason: "no_family" };
  }

  const memberIds = new Set(
    [family.user_1_id, family.user_2_id].filter(Boolean) as string[],
  );
  const members = ((membersResult.data ?? []) as UserRow[])
    .filter((member) => memberIds.has(member.id))
    .map((member) => ({
      id: member.id,
      name: member.full_name?.trim() || "Sin nombre",
      avatarUrl: member.avatar_url,
    }));

  type RawHomeExpense = Omit<HomeExpenseRow, "profiles"> & {
    profiles:
      | { full_name: string | null; avatar_url: string | null }
      | { full_name: string | null; avatar_url: string | null }[]
      | null;
  };

  const rawExpenses = (expensesResult.data ?? []) as RawHomeExpense[];
  const normalizedExpenses: HomeExpenseRow[] = rawExpenses.map((row) => ({
    ...row,
    profiles: Array.isArray(row.profiles) ? (row.profiles[0] ?? null) : row.profiles,
  }));

  const coupleExpenses = filterExpensesForPrivacy(normalizedExpenses, user.id);
  const expenseRowsForDashboard = coupleExpenses.map((expense) => ({
    id: expense.id,
    amount: expense.amount,
    concept: expense.concept,
    paid_by: expense.paid_by,
    split_type: expense.split_type,
    payer_share_pct: expense.payer_share_pct,
    expense_date: expense.expense_date,
    created_at: expense.created_at,
    responsible_for: expense.responsible_for,
    category: expense.category,
  })) as ExpenseRow[];

  const dashboard = buildDashboardFromParts(
    family,
    user.id,
    members,
    expenseRowsForDashboard,
  );

  const partnerId = members.find((member) => member.id !== user.id)?.id ?? null;
  const partnerMember = partnerId
    ? members.find((member) => member.id === partnerId)
    : null;
  const familyMemberCount = membersResult.data?.length ?? members.length;
  const mySpent = sumMemberShare(coupleExpenses, user.id);
  const partnerSpent = partnerId ? sumMemberShare(coupleExpenses, partnerId) : 0;
  const { fundBalance, personalBalance } =
    partnerId && familyMemberCount >= 2
      ? calculateFundAndPersonalBalances(coupleExpenses, user.id, partnerId)
      : { fundBalance: 0, personalBalance: 0 };
  const pocketBalance = calculatePersonalPocketBalance(coupleExpenses, user.id);

  const currentMember = members.find((member) => member.id === user.id);

  return {
    ok: true,
    data: {
      userId: user.id,
      userEmail: user.email ?? null,
      familyId,
      familyMemberCount,
      financialModel: family.financial_model ?? "joint_fund",
      currentUserName:
        profile.full_name?.trim() ||
        currentMember?.name ||
        user.email?.split("@")[0] ||
        "Usuario",
      partnerFirstName: getFirstName(partnerMember?.name, "Mi pareja"),
      avatarUrl: profile.avatar_url ?? currentMember?.avatarUrl ?? null,
      dashboard,
      coupleExpenses,
      mySpent,
      partnerSpent,
      fundBalance,
      personalBalance,
      pocketBalance,
    },
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const home = await getHomePageData();
  if (!home.ok) {
    return getFallbackData();
  }
  return home.data.dashboard;
}
