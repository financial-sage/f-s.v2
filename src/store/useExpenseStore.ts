"use client";

import { create } from "zustand";
import { createClient } from "@/utils/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface StoreExpenseRow {
  id: string;
  amount: number;
  concept: string;
  paid_by: string;
  responsible_for: string | null;
  category: string | null;
  split_type: string;
  payer_share_pct: number;
  expense_date: string;
  created_at: string;
  is_settled: boolean;
  is_active: boolean;
  family_id: string;
}

export interface UserProfile {
  id: string;
  family_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface FamilyInfo {
  financial_model: string;
  user_1_id: string;
  user_2_id: string | null;
}

interface ExpenseStoreState {
  // Auth & profile
  userId: string | null;
  familyId: string | null;
  financialModel: string;
  partnerId: string | null;
  partnerName: string;
  isPremium: boolean;

  // Data
  expenses: StoreExpenseRow[];

  // Computed balances
  myAvailableFund: number;
  fundLiquidity: number;
  p2pBalance: number;

  // State flags
  isHydrated: boolean;
  isFetching: boolean;

  // Actions
  fetchData: (userId?: string) => Promise<void>;
  refreshData: () => Promise<void>;
  reset: () => void;
}

// ─── Privacy filter (client-side mirror of lib/dashboard.ts) ─────────────────

function filterExpensesForPrivacy<
  T extends { paid_by: string; responsible_for?: string | null }
>(expenses: T[], currentUserId: string): T[] {
  const sharedAliases = new Set(["joint_fund", "fondo_comun", "shared", "compartido"]);
  const partnerAliases = new Set(["partner", "pareja"]);

  return expenses.filter((expense) => {
    const responsibleForRaw = String(expense.responsible_for ?? "").trim();
    const responsibleFor = responsibleForRaw.toLowerCase();

    if (sharedAliases.has(responsibleFor)) return true;
    if (expense.paid_by === currentUserId) return true;
    if (expense.responsible_for === currentUserId) return true;
    if (partnerAliases.has(responsibleFor) && expense.paid_by !== currentUserId) return true;
    return false;
  });
}

// ─── Balance calculators ──────────────────────────────────────────────────────

function computeBalances(
  expenses: StoreExpenseRow[],
  userId: string,
  financialModel: string
) {
  const myAvailableFund = (() => {
    const income = expenses
      .filter((e) => e.category === "deposit" && (e.responsible_for === userId || e.responsible_for === "mio"))
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const out = expenses
      .filter((e) => e.paid_by === userId && e.category !== "deposit" && e.category !== "withdrawal")
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    return income - out;
  })();

  const fundLiquidity = (() => {
    const income = expenses
      .filter((e) => e.category === "deposit" && e.responsible_for === "joint_fund")
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const direct = expenses
      .filter((e) => e.responsible_for === "joint_fund" && e.paid_by === "joint_fund" && e.category !== "deposit" && e.category !== "withdrawal")
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const withdrawals = expenses
      .filter((e) => e.category === "withdrawal" && e.responsible_for === "joint_fund")
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    return income - direct - withdrawals;
  })();

  const p2pBalance = (() => {
    const owesMe = expenses
      .filter((e) => e.paid_by === userId && e.responsible_for !== userId && e.responsible_for !== "joint_fund" && e.category !== "deposit" && !e.is_settled)
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const iOwe = expenses
      .filter((e) => e.paid_by !== userId && e.paid_by !== "joint_fund" && e.responsible_for === userId && e.category !== "deposit" && !e.is_settled)
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    return owesMe - iOwe;
  })();

  return { myAvailableFund, fundLiquidity, p2pBalance };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useExpenseStore = create<ExpenseStoreState>((set, get) => ({
  userId: null,
  familyId: null,
  financialModel: "joint_fund",
  partnerId: null,
  partnerName: "Pareja",
  isPremium: false,
  expenses: [],
  myAvailableFund: 0,
  fundLiquidity: 0,
  p2pBalance: 0,
  isHydrated: false,
  isFetching: false,

  fetchData: async (passedUserId?: string) => {
    if (get().isFetching) return;
    set({ isFetching: true });

    try {
      const supabase = createClient();

      // Resolve user
      let userId = passedUserId ?? get().userId;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { set({ isFetching: false }); return; }
        userId = user.id;
      }

      // Fetch profile, family and expenses in parallel
      const [profileResult, familyResult, expensesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("family_id, full_name, avatar_url, is_premium")
          .eq("id", userId)
          .single(),
        supabase
          .from("families")
          .select("financial_model, user_1_id, user_2_id")
          .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`)
          .maybeSingle(),
        // Expenses query is run after we have familyId — handled below
        Promise.resolve(null),
      ]);

      const familyId = profileResult.data?.family_id ?? null;
      if (!familyId) { set({ isFetching: false, isHydrated: true }); return; }

      const family = familyResult.data as FamilyInfo | null;
      const financialModel = family?.financial_model ?? "joint_fund";
      const partnerId = family
        ? (family.user_1_id === userId ? family.user_2_id : family.user_1_id)
        : null;

      // Fetch partner name and all expenses in parallel
      const [partnerProfileResult, rawExpensesResult] = await Promise.all([
        partnerId
          ? supabase.from("profiles").select("full_name").eq("id", partnerId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("expenses")
          .select("id, amount, concept, paid_by, responsible_for, category, split_type, payer_share_pct, expense_date, created_at, is_settled, is_active, family_id")
          .eq("family_id", familyId)
          .eq("is_active", true)
          .order("expense_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      const partnerName =
        (partnerProfileResult as { data: { full_name?: string | null } | null }).data?.full_name
          ?.trim()
          .split(/\s+/)[0] ?? "Pareja";

      const rawExpenses = (rawExpensesResult.data ?? []) as StoreExpenseRow[];
      const expenses = filterExpensesForPrivacy(rawExpenses, userId) as StoreExpenseRow[];
      const { myAvailableFund, fundLiquidity, p2pBalance } = computeBalances(expenses, userId, financialModel);

      const isPremium = (profileResult.data as { is_premium?: boolean | null } | null)?.is_premium === true;

      set({
        userId,
        familyId,
        financialModel,
        partnerId,
        partnerName,
        isPremium,
        expenses,
        myAvailableFund,
        fundLiquidity,
        p2pBalance,
        isHydrated: true,
        isFetching: false,
      });
    } catch {
      set({ isFetching: false, isHydrated: true });
    }
  },

  refreshData: async () => {
    // Re-run the same fetch without resetting isHydrated (keeps UI visible)
    const { userId } = get();
    set({ isFetching: false }); // reset lock so fetchData runs
    await get().fetchData(userId ?? undefined);
  },

  reset: () =>
    set({
      userId: null,
      familyId: null,
      financialModel: "joint_fund",
      partnerId: null,
      partnerName: "Pareja",
      isPremium: false,
      expenses: [],
      myAvailableFund: 0,
      fundLiquidity: 0,
      p2pBalance: 0,
      isHydrated: false,
      isFetching: false,
    }),
}));
