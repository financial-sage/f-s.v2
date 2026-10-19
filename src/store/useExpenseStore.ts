"use client";

import { create } from "zustand";
import { createClient } from "@/utils/supabase/client";
import { isAccountOnlyMovement } from "@/lib/accounts";
import { isPersonalPocketCashOut } from "@/lib/funds";

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
    fund_id?: string | null;
    paid_from_fund?: boolean | null;
    account_id?: string | null;
    paid_from_account?: boolean | null;
    transfer_group_id?: string | null;
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
    /** Short notice when the partner mutates expenses over Realtime */
    remoteNotice: string | null;

    // Actions
    fetchData: (userId?: string) => Promise<void>;
    refreshData: () => Promise<void>;
    applyRealtimeChange: (payload: RealtimeExpensePayload) => void;
    clearRemoteNotice: () => void;
    reset: () => void;
}

export type RealtimeExpenseEvent = "INSERT" | "UPDATE" | "DELETE";

export interface RealtimeExpensePayload {
    eventType: RealtimeExpenseEvent;
    new?: Record<string, unknown> | null;
    old?: Record<string, unknown> | null;
}

// ─── Privacy filter (client-side mirror of lib/dashboard.ts) ─────────────────

function filterExpensesForPrivacy<
    T extends {
        paid_by: string;
        responsible_for?: string | null;
        account_id?: string | null;
    }
>(
    expenses: T[],
    currentUserId: string,
    accountsById?: Map<
        string,
        { scope: string; owner_profile_id: string | null; visibility: string }
    >
): T[] {
    const sharedAliases = new Set(["joint_fund", "fondo_comun", "shared", "compartido"]);
    const partnerAliases = new Set(["partner", "pareja"]);

    return expenses.filter((expense) => {
        const responsibleForRaw = String(expense.responsible_for ?? "").trim();
        const responsibleFor = responsibleForRaw.toLowerCase();

        if (sharedAliases.has(responsibleFor)) return true;
        if (expense.paid_by === currentUserId) return true;
        if (expense.responsible_for === currentUserId) return true;
        if (partnerAliases.has(responsibleFor) && expense.paid_by !== currentUserId) return true;

        if (expense.account_id && accountsById) {
            const account = accountsById.get(expense.account_id);
            if (
                account &&
                account.scope === "personal" &&
                account.visibility === "family_visible" &&
                account.owner_profile_id !== currentUserId
            ) {
                return true;
            }
            if (
                account &&
                account.scope === "personal" &&
                account.visibility === "private" &&
                account.owner_profile_id !== currentUserId
            ) {
                return false;
            }
            if (account?.scope === "shared") return true;
        }

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
        // 1. Ingresos a MI fondo: aportes / reembolsos al bolsillo personal (nunca caja de cuenta).
        // Liquidaciones (withdrawal del compartido) NO suman aquí: el crédito ya viene en el deposit "Reembolso del fondo".
        const income = expenses
            .filter((e) => !e.account_id)
            .filter(
                (e) =>
                    e.category === "deposit" &&
                    (e.responsible_for === userId || e.responsible_for === "mio")
            )
            .reduce((s, e) => s + Number(e.amount || 0), 0);

        // 2. Salidas de MI bolsillo personal (no cajas compartidas / gastos fijos)
        const out = expenses
            .filter((e) => !e.account_id)
            .filter((e) => isPersonalPocketCashOut(e, userId))
            .reduce((s, e) => s + Number(e.amount || 0), 0);

        // 3. Retiros / transferencias salientes del bolsillo personal
        const withdrawals = expenses
            .filter((e) => !e.account_id)
            .filter(
                (e) =>
                    e.category === "withdrawal" &&
                    (e.responsible_for === userId || e.responsible_for === "mio")
            )
            .reduce((s, e) => s + Number(e.amount || 0), 0);

        return income - out - withdrawals;
    })();

    const fundLiquidity = (() => {
        const fundRows = expenses.filter((e) => !isAccountOnlyMovement(e));
        const income = fundRows
            .filter(
                (e) =>
                    e.category === "deposit" &&
                    !e.transfer_group_id &&
                    (e.responsible_for === "joint_fund" || !!e.fund_id)
            )
            .filter((e) => e.responsible_for === "joint_fund" || e.paid_from_fund === false)
            .reduce((s, e) => s + Number(e.amount || 0), 0);

        // Prefer shared-legacy deposits only for default common fund liquidity widget
        const sharedIncome = fundRows
            .filter((e) => e.category === "deposit" && e.responsible_for === "joint_fund" && !e.transfer_group_id)
            .reduce((s, e) => s + Number(e.amount || 0), 0);
        const direct = fundRows
            .filter(
                (e) =>
                    e.responsible_for === "joint_fund" &&
                    (e.paid_by === "joint_fund" || e.paid_from_fund === true) &&
                    e.category !== "deposit" &&
                    e.category !== "withdrawal" &&
                    !e.transfer_group_id
            )
            .reduce((s, e) => s + Number(e.amount || 0), 0);
        const withdrawals = fundRows
            .filter(
                (e) =>
                    e.category === "withdrawal" &&
                    e.responsible_for === "joint_fund" &&
                    !e.transfer_group_id
            )
            .reduce((s, e) => s + Number(e.amount || 0), 0);
        void income;
        return sharedIncome - direct - withdrawals;
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

function mapRealtimeRow(raw: Record<string, unknown> | null | undefined): StoreExpenseRow | null {
    if (!raw || raw.id == null) return null;
    return {
        id: String(raw.id),
        amount: Number(raw.amount || 0),
        concept: String(raw.concept ?? ""),
        paid_by: String(raw.paid_by ?? ""),
        responsible_for: raw.responsible_for == null ? null : String(raw.responsible_for),
        category: raw.category == null ? null : String(raw.category),
        split_type: String(raw.split_type ?? "full"),
        payer_share_pct: Number(raw.payer_share_pct ?? 100),
        expense_date: String(raw.expense_date ?? ""),
        created_at: String(raw.created_at ?? new Date().toISOString()),
        is_settled: Boolean(raw.is_settled),
        is_active: raw.is_active !== false,
        family_id: String(raw.family_id ?? ""),
        fund_id: raw.fund_id == null ? null : String(raw.fund_id),
        paid_from_fund: raw.paid_from_fund == null ? null : Boolean(raw.paid_from_fund),
        account_id: raw.account_id == null ? null : String(raw.account_id),
        paid_from_account: raw.paid_from_account == null ? null : Boolean(raw.paid_from_account),
        transfer_group_id: raw.transfer_group_id == null ? null : String(raw.transfer_group_id),
    };
}

function sortExpensesNewestFirst(rows: StoreExpenseRow[]) {
    return [...rows].sort((a, b) => {
        const byDate = String(b.expense_date).localeCompare(String(a.expense_date));
        if (byDate !== 0) return byDate;
        return String(b.created_at).localeCompare(String(a.created_at));
    });
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
    remoteNotice: null,

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

            // Fetch partner name, expenses and accounts in parallel
            const [partnerProfileResult, rawExpensesResult, accountsResult] = await Promise.all([
                partnerId
                    ? supabase.from("profiles").select("full_name").eq("id", partnerId).maybeSingle()
                    : Promise.resolve({ data: null }),
                supabase
                    .from("expenses")
                    .select("id, amount, concept, paid_by, responsible_for, category, split_type, payer_share_pct, expense_date, created_at, is_settled, is_active, family_id, fund_id, paid_from_fund, account_id, paid_from_account, transfer_group_id")
                    .eq("family_id", familyId)
                    .eq("is_active", true)
                    .order("expense_date", { ascending: false })
                    .order("created_at", { ascending: false })
                    // Cap payload for snappy nav; older rows remain in History via filters later if needed.
                    .limit(400),
                supabase
                    .from("family_accounts")
                    .select("id, scope, owner_profile_id, visibility")
                    .eq("family_id", familyId)
                    .is("archived_at", null),
            ]);

            // If account columns/table missing, retry expenses without them
            let expenseRows: unknown = rawExpensesResult.data;
            if (rawExpensesResult.error && /account_id|paid_from_account|column/i.test(rawExpensesResult.error.message)) {
                const legacy = await supabase
                    .from("expenses")
                    .select("id, amount, concept, paid_by, responsible_for, category, split_type, payer_share_pct, expense_date, created_at, is_settled, is_active, family_id, fund_id, paid_from_fund, transfer_group_id")
                    .eq("family_id", familyId)
                    .eq("is_active", true)
                    .order("expense_date", { ascending: false })
                    .order("created_at", { ascending: false })
                    .limit(400);
                expenseRows = legacy.data;
            }

            const accountsById = new Map(
                ((accountsResult.data ?? []) as Array<{
                    id: string;
                    scope: string;
                    owner_profile_id: string | null;
                    visibility: string;
                }>).map((a) => [a.id, a])
            );

            const partnerName =
                (partnerProfileResult as { data: { full_name?: string | null } | null }).data?.full_name
                    ?.trim()
                    .split(/\s+/)[0] ?? "Pareja";

            const rawExpenses = (expenseRows ?? []) as StoreExpenseRow[];
            const expenses = filterExpensesForPrivacy(
                rawExpenses,
                userId,
                accountsById
            ) as StoreExpenseRow[];
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

    applyRealtimeChange: (payload) => {
        const { userId, familyId, financialModel, partnerId, partnerName, expenses } = get();
        if (!userId || !familyId) return;

        const removeById = (id: string) => {
            const next = expenses.filter((e) => e.id !== id);
            if (next.length === expenses.length) return;
            const balances = computeBalances(next, userId, financialModel);
            set({ expenses: next, ...balances });
        };

        if (payload.eventType === "DELETE") {
            const oldId = payload.old?.id;
            if (oldId != null) removeById(String(oldId));
            return;
        }

        const row = mapRealtimeRow(payload.new);
        if (!row || row.family_id !== familyId) return;

        // Soft-delete / inactive → drop from live lists
        if (!row.is_active) {
            removeById(row.id);
            return;
        }

        const visible = filterExpensesForPrivacy([row], userId);
        if (visible.length === 0) {
            removeById(row.id);
            return;
        }

        const without = expenses.filter((e) => e.id !== row.id);
        const next = sortExpensesNewestFirst([row, ...without]).slice(0, 400);
        const balances = computeBalances(next, userId, financialModel);

        const fromPartner = Boolean(partnerId) && row.paid_by === partnerId;
        const notice =
            fromPartner && payload.eventType === "INSERT"
                ? `${partnerName} registró “${row.concept || "un movimiento"}”`
                : fromPartner && payload.eventType === "UPDATE"
                  ? `${partnerName} actualizó un movimiento`
                  : null;

        set({
            expenses: next,
            ...balances,
            ...(notice ? { remoteNotice: notice } : {}),
        });
    },

    clearRemoteNotice: () => set({ remoteNotice: null }),

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
            remoteNotice: null,
        }),
}));
